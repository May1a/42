"use client";

import { useEffect, useState } from "react";
import type { ApiError, Pagination } from "@/shared/forty-two";
import type { ClientSession } from "./use-session";
import { sessionExpired } from "./use-session";
import { buildProxyUrl, enqueueApi, errorMessage, paginationFrom, parseResponseBody, readJson, writeJson, type ApiParams } from "./forty-two-client";

const CACHE_PREFIX = "42explorer.cache.";

export type ApiState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  pagination: Pagination | null;
};

function cacheKey(session: ClientSession, path: string, params: ApiParams) {
  const userPart = session.user?.id ?? "anonymous";
  return `${CACHE_PREFIX}${userPart}:${path}:${JSON.stringify(params)}`;
}

function readCache<T>(key: string) {
  const cached = readJson<{ expiresAt: number; data: T; pagination: Pagination }>(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }
  return cached;
}

function writeCache<T>(key: string, ttl: number, data: T, pagination: Pagination) {
  if (ttl <= 0) {
    return;
  }
  writeJson(key, { expiresAt: Date.now() + ttl, data, pagination });
}

async function request42<T>(session: ClientSession, path: string, params: ApiParams = {}, ttl = 0) {
  const key = cacheKey(session, path, params);
  const cached = ttl > 0 ? readCache<T>(key) : null;
  if (cached) {
    return { data: cached.data, pagination: cached.pagination };
  }

  return enqueueApi(async () => {
    const response = await fetch(buildProxyUrl(path, params), { credentials: "include" });
    const body = await parseResponseBody(response);
    const pagination = paginationFrom(response.headers);

    if (!response.ok) {
      throw {
        status: response.status,
        message: errorMessage(response.status, body),
        details: body
      } satisfies ApiError;
    }

    const data = body as T;
    writeCache(key, ttl, data, pagination);
    return { data, pagination };
  });
}

export function useApiResource<T>(session: ClientSession | null, path: string | null, params: ApiParams = {}, ttl = 0, refreshKey = 0): ApiState<T> {
  const paramsKey = JSON.stringify(params);
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: false,
    pagination: null
  });

  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ data: null, error: null, loading: false, pagination: null });
      return () => {
        active = false;
      };
    }

    if (sessionExpired(session)) {
      setState({
        data: null,
        error: { status: 401, message: "Log in with 42 to load this data." },
        loading: false,
        pagination: null
      });
      return () => {
        active = false;
      };
    }

    setState((previous) => ({ ...previous, error: null, loading: true }));
    void request42<T>(session!, path, params, ttl)
      .then((result) => {
        if (active) {
          setState({ data: result.data, error: null, loading: false, pagination: result.pagination });
        }
      })
      .catch((error: ApiError) => {
        if (active) {
          setState({
            data: null,
            error: {
              status: Number(error.status || 500),
              message: error.message || "Unable to load 42 data.",
              details: error.details
            },
            loading: false,
            pagination: null
          });
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user?.id, session?.expiresAt, path, paramsKey, ttl, refreshKey]);

  return state;
}

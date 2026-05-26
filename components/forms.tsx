"use client";

import type { ReactNode } from "react";

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="button-primary" href={href}>
      {children}
    </a>
  );
}

export function PlainButton({ children, onClick, type = "button", disabled = false }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button className="button" disabled={disabled} type={type} onClick={onClick}>
      {children}
    </button>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {children}
      </select>
    </label>
  );
}

export function TextField({
  label,
  value,
  onInput,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" placeholder={placeholder} type={type} value={value} onChange={(event) => onInput(event.currentTarget.value)} />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onInput,
  placeholder
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="textarea" placeholder={placeholder} value={value} onChange={(event) => onInput(event.currentTarget.value)} />
    </label>
  );
}

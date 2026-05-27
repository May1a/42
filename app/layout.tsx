import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "42 Explorer",
  description: "Read-heavy 42 API explorer with feature proposals."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

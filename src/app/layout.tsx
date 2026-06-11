import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memorial Pages",
  description: "A quiet, private place for families to remember a loved one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

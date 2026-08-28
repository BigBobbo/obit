import type { Metadata } from "next";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";

export const metadata: Metadata = {
  title: "Memorial Pages",
  description: "A quiet, private place for families to remember a loved one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}

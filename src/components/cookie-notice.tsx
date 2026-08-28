"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "mp_cookie_notice_ack";

/**
 * Cookie notice (PRD §6 legal basics).
 *
 * A notice, not a consent gate: the app sets only strictly necessary cookies
 * (the sign-in session and the returning-contributor token), so there is
 * nothing to opt out of — and a page for someone's funeral is the last place
 * to put a consent wall in front of a grieving visitor.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setVisible(true);
    } catch {
      // Private mode or blocked storage: say nothing rather than nagging on
      // every page view.
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Ignore — dismissing for this session is still better than nothing.
    }
    setVisible(false);
  }

  return (
    <div
      role="note"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-6 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          We use only strictly necessary cookies — your sign-in session and, if
          you contribute, a token that remembers your verified email. No
          advertising or tracking.{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy policy
          </Link>
        </p>
        <Button size="sm" variant="outline" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}

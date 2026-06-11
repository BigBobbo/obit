"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminReportActions({
  reportId,
  pageId,
  pageStatus,
  reporterEmail,
}: {
  reportId: string;
  pageId: string;
  pageStatus: string;
  reporterEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reportId, pageId, ...extra }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Done." : data.error ?? "Action failed.");
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {pageStatus !== "frozen" ? (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("freeze_page")}>
            Freeze page
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("unfreeze_page")}>
            Unfreeze page
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const email = window.prompt("Ban which email?", reporterEmail ? "" : "");
            if (email) act("ban_email", { email });
          }}
        >
          Ban email…
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const email = window.prompt(
              "Transfer page ownership to which user's email? (They must have an account.)",
            );
            if (email) act("transfer_ownership", { email });
          }}
        >
          Transfer ownership…
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            const note = window.prompt("Resolution note:", "Resolved — no action needed.");
            if (note !== null) act("resolve_report", { resolution: note });
          }}
        >
          Resolve report
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

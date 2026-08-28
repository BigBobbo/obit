"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

export type AccessRequestCard = {
  id: string;
  name: string;
  email: string;
  relationship: string | null;
  createdAt: string;
  verifiedAt: string | null;
};

/**
 * The family's door (PRD v2 §1.1).
 *
 * Two things carry the design: declining is silent (nobody has to write a
 * rejection, nobody receives one), and close family can be added in advance so
 * they never sit in a queue their own relative is meant to be watching.
 */
export function AccessRequestsPanel({
  pageId,
  requests,
  preapprovedCount,
}: {
  pageId: string;
  requests: AccessRequestCard[];
  preapprovedCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState("");
  const [preapproveBusy, setPreapproveBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setHandled((prev) => new Set(prev).add(id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function preapprove() {
    setPreapproveBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/access/preapprove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Added ${data.added} ${data.added === 1 ? "address" : "addresses"}` +
            (data.skipped ? `, ${data.skipped} already on the list.` : "."),
        );
        setEmails("");
        router.refresh();
      } else {
        setMessage(data.error ?? "Could not save that list.");
      }
    } finally {
      setPreapproveBusy(false);
    }
  }

  const visible = requests.filter((r) => !handled.has(r.id));

  return (
    <div className="space-y-4">
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody is waiting for access.</p>
      ) : (
        visible.map((r) => (
          <article key={r.id} className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium">{r.name || r.email}</p>
            <p className="text-sm text-muted-foreground">{r.email}</p>
            {r.relationship && <p className="mt-2 text-sm">“{r.relationship}”</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              Asked {formatDate(r.createdAt)}
              {r.verifiedAt ? " · email confirmed" : " · email not confirmed yet"}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" disabled={busyId === r.id} onClick={() => decide(r.id, "approve")}>
                Let them in
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === r.id}
                onClick={() => decide(r.id, "decline")}
              >
                No thank you
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Declining sends nothing. They simply keep seeing “the family will
              review your request”.
            </p>
          </article>
        ))
      )}

      <div className="space-y-2 rounded-lg border border-border bg-card p-5">
        <Label htmlFor="preapprove">Add people in advance</Label>
        <p className="text-sm text-muted-foreground">
          Paste email addresses — close family shouldn&apos;t have to wait for
          you. They still confirm their address, but they never sit in this
          queue. {preapprovedCount > 0 && `${preapprovedCount} on the list.`}
        </p>
        <Textarea
          id="preapprove"
          rows={3}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="anna@example.com, joe@example.com"
        />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button size="sm" variant="outline" disabled={preapproveBusy || !emails.trim()} onClick={preapprove}>
          {preapproveBusy ? "Adding…" : "Add to the list"}
        </Button>
      </div>
    </div>
  );
}

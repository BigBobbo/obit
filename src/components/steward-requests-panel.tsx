"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type StewardRequest = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  message: string;
  status: string;
  createdAt: string;
};

/** Requests from people asking to help look after the page (PRD §6). */
export function StewardRequestsPanel({ requests }: { requests: StewardRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());

  async function act(id: string, action: "approve" | "decline") {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/steward-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "That didn't work. Please try again.");
        return;
      }
      // awaiting_signup keeps the request open on purpose: the approval is
      // recorded, but it only completes once they have an account.
      if (data.outcome === "awaiting_signup") {
        setMessage(data.message ?? "We've emailed them to sign up first.");
      } else {
        setHandled((prev) => new Set(prev).add(id));
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const visible = requests.filter((r) => !handled.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {visible.map((r) => (
        <article key={r.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.name}</span>
            <span className="text-sm text-muted-foreground">{r.email}</span>
            <Badge variant="muted">{r.relationship}</Badge>
            {r.status === "awaiting_signup" && <Badge variant="warning">waiting for their account</Badge>}
          </div>
          {r.message && <p className="mt-3 whitespace-pre-wrap text-sm">{r.message}</p>}
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "approve")}>
              Add as co-steward
            </Button>
            <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => act(r.id, "decline")}>
              Decline
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

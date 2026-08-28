"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { publicPhotoUrlClient } from "@/lib/public-url";
import { DECLINE_TEMPLATES, resolveDeclineReason } from "@/lib/decline-templates";

type QueueMemory = {
  id: string;
  contributorName: string;
  contributorEmail: string;
  body: string;
  createdAt: string;
  flags: string[];
  photos: { id: string; sizes: Record<string, { path: string }> }[];
};

type Decline = { memoryId: string; block: boolean; templateId: string; custom: string };

/**
 * One-tap approve (PRD §4.5); a decline takes one more tap, on purpose
 * (PRD v2 §2.3).
 *
 * The extra step is choosing what the contributor is told. Unexplained removal
 * is what stops someone contributing again — three sentences cover almost every
 * real case, and a steward can always write their own.
 */
export function ModerationQueue({ memories }: { memories: QueueMemory[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [declining, setDeclining] = useState<Decline | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        setHandled((prev) => new Set(prev).add(id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDecline() {
    if (!declining) return;
    setBusyId(declining.memoryId);
    try {
      const res = await fetch(`/api/memories/${declining.memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: declining.block ? "reject_and_block" : "reject",
          declineTemplate: declining.templateId,
          declineReason: declining.custom,
        }),
      });
      if (res.ok) {
        setHandled((prev) => new Set(prev).add(declining.memoryId));
        setDeclining(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  const visible = memories.filter((m) => !handled.has(m.id));

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>;
  }

  return (
    <div className="space-y-4">
      {visible.map((m) => (
        <article key={m.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{m.contributorName}</span>
            <span>·</span>
            <span>{m.contributorEmail}</span>
            {m.flags.map((f) => (
              <Badge key={f} variant="warning">{f.replace(/_/g, " ")}</Badge>
            ))}
          </div>
          {m.body && <p className="mt-3 whitespace-pre-wrap font-serif">{m.body}</p>}
          {m.photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {m.photos.map((p) => {
                const path = p.sizes?.thumb?.path ?? p.sizes?.medium?.path;
                if (!path) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={publicPhotoUrlClient(path)}
                    alt=""
                    className="h-24 w-24 rounded-md object-cover"
                  />
                );
              })}
            </div>
          )}

          {declining?.memoryId === m.id ? (
            <div className="mt-4 space-y-3 rounded-md border border-border p-4">
              <p className="text-sm">
                <strong>What should {m.contributorName} be told?</strong> They
                took the time to write this, so they hear something either way.
              </p>
              {DECLINE_TEMPLATES.map((t) => (
                <label key={t.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name={`decline-${m.id}`}
                    className="mt-1"
                    checked={declining.templateId === t.id && !declining.custom}
                    onChange={() =>
                      setDeclining({ ...declining, templateId: t.id, custom: "" })
                    }
                  />
                  <span>
                    <strong>{t.label}</strong>
                    <span className="block text-muted-foreground">{t.body}</span>
                  </span>
                </label>
              ))}
              <Textarea
                rows={3}
                placeholder="Or write your own…"
                value={declining.custom}
                onChange={(e) => setDeclining({ ...declining, custom: e.target.value })}
              />
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={declining.block}
                  onChange={(e) => setDeclining({ ...declining, block: e.target.checked })}
                />
                <span>Also block this contributor from this page</span>
              </label>
              <p className="text-xs text-muted-foreground">
                They will receive: “{resolveDeclineReason({
                  templateId: declining.templateId,
                  custom: declining.custom,
                })}”
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busyId === m.id} onClick={confirmDecline}>
                  {busyId === m.id ? "Sending…" : "Decline and let them know"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeclining(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button size="sm" disabled={busyId === m.id} onClick={() => approve(m.id)}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === m.id}
                onClick={() =>
                  setDeclining({
                    memoryId: m.id,
                    block: false,
                    templateId: DECLINE_TEMPLATES[0].id,
                    custom: "",
                  })
                }
              >
                Decline…
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

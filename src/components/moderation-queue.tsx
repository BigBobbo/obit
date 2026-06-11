"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicPhotoUrlClient } from "@/lib/public-url";

type QueueMemory = {
  id: string;
  contributorName: string;
  contributorEmail: string;
  body: string;
  createdAt: string;
  flags: string[];
  photos: { id: string; sizes: Record<string, { path: string }> }[];
};

/** One-tap approve / reject / reject+block (PRD §4.5). */
export function ModerationQueue({ memories }: { memories: QueueMemory[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());

  async function act(id: string, action: "approve" | "reject" | "reject_and_block") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/memories/${id}`, {
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
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled={busyId === m.id} onClick={() => act(m.id, "approve")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => act(m.id, "reject")}>
              Reject
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId === m.id}
              onClick={() => act(m.id, "reject_and_block")}
            >
              Reject + block contributor
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

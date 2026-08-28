"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicPhotoUrlClient } from "@/lib/public-url";

export type ReportedMemory = {
  reportId: string;
  category: string;
  evidence: string | null;
  createdAt: string;
  memory: {
    id: string;
    contributorName: string;
    contributorEmail: string;
    body: string;
    status: string;
    photos: { id: string; sizes: Record<string, { path: string }> }[];
  } | null;
};

/**
 * Reports on memories, with the actions to settle them (PRD §4.6). The
 * reported memory is shown in full — a steward cannot judge a report against
 * content they cannot see.
 */
export function MemoryReports({ reports }: { reports: ReportedMemory[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function act(
    reportId: string,
    action: "dismiss" | "remove_memory" | "remove_and_block" | "escalate",
  ) {
    setBusyId(reportId);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setHandled((prev) => new Set(prev).add(reportId));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "That didn't work. Please reload and try again.");
      }
    } finally {
      setBusyId(null);
    }
  }

  const visible = reports.filter((r) => !handled.has(r.reportId));
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No reports waiting on you.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {visible.map((r) => (
        <article key={r.reportId} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{r.category.replace(/_/g, " ")}</Badge>
            <span className="text-sm text-muted-foreground">
              reported {new Date(r.createdAt).toLocaleDateString()}
            </span>
            {r.memory?.status === "approved" && <Badge variant="muted">published</Badge>}
          </div>

          {r.evidence && (
            <p className="mt-3 rounded bg-muted p-3 text-sm">{r.evidence}</p>
          )}

          {r.memory ? (
            <div className="mt-4 border-l-2 border-border pl-4">
              <p className="text-sm text-muted-foreground">
                {r.memory.contributorName} · {r.memory.contributorEmail}
              </p>
              {r.memory.body && (
                <p className="mt-2 whitespace-pre-wrap font-serif">{r.memory.body}</p>
              )}
              {r.memory.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.memory.photos.map((p) => {
                    const path = p.sizes?.thumb?.path ?? p.sizes?.medium?.path;
                    if (!path) return null;
                    return (
                      <a key={p.id} href={`/api/photos/${p.id}/original`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicPhotoUrlClient(path)}
                          alt=""
                          title="Open the full-resolution original"
                          className="h-24 w-24 rounded-md object-cover"
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              The memory this report refers to is no longer on the page.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busyId === r.reportId} onClick={() => act(r.reportId, "dismiss")}>
              Keep it (dismiss report)
            </Button>
            <Button size="sm" variant="destructive" disabled={busyId === r.reportId} onClick={() => act(r.reportId, "remove_memory")}>
              Remove memory
            </Button>
            <Button size="sm" variant="destructive" disabled={busyId === r.reportId} onClick={() => act(r.reportId, "remove_and_block")}>
              Remove + block contributor
            </Button>
            <Button size="sm" variant="ghost" disabled={busyId === r.reportId} onClick={() => act(r.reportId, "escalate")}>
              Ask the Memorial Pages team
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

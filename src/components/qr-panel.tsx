"use client";

import { Button } from "@/components/ui/button";

export function QrPanel({
  pageId,
  randomId,
  paid,
}: {
  pageId: string;
  randomId: string;
  paid: boolean;
}) {
  const pageUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/m/${randomId}`;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        The QR code points to this page&apos;s permanent link:{" "}
        <code className="rounded bg-muted px-1">/m/{randomId}</code>. It never
        changes — safe to engrave.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/qr/${pageId}?format=png`}>Download PNG</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/qr/${pageId}?format=svg`}>Download SVG</a>
        </Button>
        {paid ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/qr/${pageId}?format=pdf&design=classic`}>Plaque PDF (classic)</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/qr/${pageId}?format=pdf&design=minimal`}>Plaque PDF (minimal)</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/qr/${pageId}?format=pdf&design=card`}>Memorial card PDF</a>
            </Button>
          </>
        ) : (
          <span className="self-center text-xs text-muted-foreground">
            Print-ready plaque and card PDFs are a paid feature.
          </span>
        )}
      </div>
      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(pageUrl)}
        >
          Copy page link
        </Button>
      </div>
    </div>
  );
}

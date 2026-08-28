"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Share sheet (PRD v2 §2.2).
 *
 * The only virality loop that works in this category is need-driven week-one
 * sharing — one person forwarding a link to people who need it. So: native
 * share on a phone, copy-link everywhere, and prewritten words the sharer can
 * edit, because "I don't know what to say" is what stops the forward.
 *
 * The access code line exists **only** in the steward's own sheet, and even
 * there the steward types it: codes are stored hashed, so nothing on the server
 * can put one back into a message. A public share sheet that carried the code
 * would hand the gate away with the link.
 */
export function ShareSheet({
  url,
  pageName,
  nextService,
  codeEntry = false,
  pageRef,
  surface = "memorial",
}: {
  url: string;
  pageName: string;
  nextService?: string | null;
  codeEntry?: boolean;
  /** The page's random_id, for the share-tap count (PRD v2 §7). */
  pageRef?: string;
  surface?: "announcement" | "memorial" | "steward";
}) {
  const [message, setMessage] = useState(() => defaultShareMessage({ pageName, url, nextService }));
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  const fullMessage = code.trim() ? `${message}\nAccess code: ${code.trim()}` : message;

  // A tap is the metric (PRD v2 §7). Fire-and-forget, and never in the way of
  // the thing the person actually pressed the button to do.
  function count(action: "share" | "copy_link" | "copy_message") {
    if (!pageRef) return;
    void fetch("/api/metrics/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageRef, surface, action }),
      keepalive: true,
    }).catch(() => {});
  }

  async function copy(what: "link" | "message") {
    count(what === "link" ? "copy_link" : "copy_message");
    try {
      await navigator.clipboard.writeText(what === "link" ? url : fullMessage);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy("message");
      return;
    }
    count("share");
    try {
      await navigator.share({ title: `In memory of ${pageName}`, text: fullMessage, url });
    } catch {
      // The sharer dismissed the sheet. Nothing to report.
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        aria-label="Message to share"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="text-base"
      />
      {codeEntry && (
        <div className="space-y-2">
          <Label htmlFor="share-code">Include the access code (optional)</Label>
          <Input
            id="share-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="nana-rose"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            We store the code hashed, so we can&apos;t fill this in for you — and
            it never appears on the page itself.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={nativeShare}>
          Share
        </Button>
        <Button type="button" variant="outline" onClick={() => copy("link")}>
          {copied === "link" ? "Link copied" : "Copy link"}
        </Button>
        <Button type="button" variant="outline" onClick={() => copy("message")}>
          {copied === "message" ? "Message copied" : "Copy message"}
        </Button>
      </div>
    </div>
  );
}

export function defaultShareMessage({
  pageName,
  url,
  nextService,
}: {
  pageName: string;
  url: string;
  nextService?: string | null;
}): string {
  return [
    `We're remembering ${pageName}.`,
    nextService ? `${nextService}.` : null,
    `Service details and a place to share memories: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

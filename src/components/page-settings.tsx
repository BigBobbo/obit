"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  name: string;
  bio: string;
  slug: string | null;
  reviewEverything: boolean;
  autoPublishOptout: boolean;
};

export function PageSettings({
  pageId,
  isOwner,
  initial,
  paid,
}: {
  pageId: string;
  isOwner: boolean;
  initial: Settings;
  paid: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [reviewEverything, setReviewEverything] = useState(initial.reviewEverything);
  const [autoPublishOptout, setAutoPublishOptout] = useState(initial.autoPublishOptout);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);

  async function save(extra?: Partial<Record<string, unknown>>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          reviewEverything,
          autoPublishOptout,
          ...(paid ? { slug: slug.trim() || null } : {}),
          ...extra,
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Saved." : data.error ?? "Save failed.");
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function uploadCover(file: File) {
    setCoverBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("photo", file);
      const res = await fetch(`/api/pages/${pageId}/cover`, { method: "POST", body: form });
      const data = await res.json();
      setMessage(res.ok ? "Cover photo updated." : data.error ?? "Upload failed.");
      if (res.ok) router.refresh();
    } finally {
      setCoverBusy(false);
    }
  }

  function toggleOptout(checked: boolean) {
    if (checked) {
      // Clear warning dialog explaining the risk (PRD §2).
      const ok = window.confirm(
        "Keep auto-publishing even if no steward is active?\n\n" +
          "Normally, if no steward signs in for 90 days, new contributions are " +
          "held for review so the page can't fill with unmoderated content. " +
          "If you opt out, new memories that pass automated checks will keep " +
          "publishing with no one watching. Are you sure?",
      );
      if (!ok) return;
    }
    setAutoPublishOptout(checked);
  }

  async function deletePage() {
    const ok = window.confirm(
      "Delete this memorial page?\n\nThe page will be hidden immediately. You have 30 days to restore it by contacting support; after that it is permanently removed.",
    );
    if (!ok) return;
    const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Delete failed.");
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="s-name">Name</Label>
        <Input id="s-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-bio">Biography</Label>
        <Textarea id="s-bio" value={bio} maxLength={10000} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-cover">Cover photo</Label>
        <Input
          id="s-cover"
          type="file"
          accept="image/*"
          disabled={coverBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCover(f);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-slug">Custom link {paid ? "" : "(paid feature)"}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/m/</span>
          <Input
            id="s-slug"
            value={slug}
            disabled={!paid}
            placeholder="john-smith-1942-2024"
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The original QR link keeps working — custom links redirect to it.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={reviewEverything}
          onChange={(e) => setReviewEverything(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <strong>Review everything</strong> — hold all contributions for your
          approval, even from trusted contributors.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={autoPublishOptout}
          onChange={(e) => toggleOptout(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <strong>Keep auto-publishing even if we&apos;re inactive</strong> —
          opt out of the 90-day safety hold.
        </span>
      </label>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="flex items-center justify-between">
        <Button onClick={() => save()} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
        {isOwner && (
          <Button variant="ghost" className="text-destructive" onClick={deletePage}>
            Delete page
          </Button>
        )}
      </div>
    </div>
  );
}

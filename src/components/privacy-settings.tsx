"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AccessMode = "link" | "code" | "approved";

const MODES: { value: AccessMode; title: string; blurb: string }[] = [
  {
    value: "link",
    title: "Anyone with the link",
    blurb:
      "How this page works today. Good when you'll only ever send the link to people you'd welcome.",
  },
  {
    value: "code",
    title: "Anyone with the code",
    blurb:
      "You choose a short code — put it on the order of service, or say it at the service. Everyone else sees only the announcement.",
  },
  {
    value: "approved",
    title: "Only people you add",
    blurb:
      "Visitors ask, and you decide one by one. You can add close family in advance so they never wait.",
  },
];

/**
 * The steward's side of the access model (PRD v2 §1).
 *
 * Written for a family, not an administrator: no "ACL", no "visibility scope",
 * and the code is described as what it is — a soft gate that stops strangers
 * and scrapers, not a lock.
 */
export function PrivacySettings({
  pageId,
  initial,
}: {
  pageId: string;
  initial: {
    accessMode: AccessMode;
    hasCode: boolean;
    announcementEnabled: boolean;
    announcementText: string;
  };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AccessMode>(initial.accessMode);
  const [code, setCode] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(initial.announcementEnabled);
  const [announcementText, setAnnouncementText] = useState(initial.announcementText);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessMode: mode,
          announcementEnabled,
          announcementText,
          ...(code.trim() ? { accessCode: code.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          code.trim()
            ? "Saved. The new code is live — anyone using the old one will be asked again."
            : "Saved.",
        );
        setCode("");
        router.refresh();
      } else {
        setMessage(data.error ?? "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-6">
      <fieldset className="space-y-3">
        <legend className="font-medium">Who can read the memories?</legend>
        {MODES.map((m) => (
          <label key={m.value} className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="access-mode"
              className="mt-1"
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
            />
            <span>
              <strong>{m.title}</strong>
              <span className="block text-muted-foreground">{m.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === "code" && (
        <div className="space-y-2 rounded-md border border-border p-4">
          <Label htmlFor="access-code-set">
            {initial.hasCode ? "Change the code" : "Choose a code"}
          </Label>
          <Input
            id="access-code-set"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="nana-rose"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {initial.hasCode
              ? "Leave blank to keep the code you have. Changing it signs out everyone who used the old one."
              : "Something the people you're inviting will remember — a nickname, a place, a pet."}
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>A code is a soft gate.</strong> It stops strangers, scrapers
            and obituary scammers. It won&apos;t stop someone who was told the
            code and shouldn&apos;t have been — for that, use &ldquo;only people
            you add&rdquo;.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-border p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={announcementEnabled}
            onChange={(e) => setAnnouncementEnabled(e.target.checked)}
          />
          <span>
            <strong>Show a public announcement</strong> — the photo, name, dates,
            a short notice and the services you mark public. People who
            don&apos;t have access see this instead of a locked door.
          </span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="announcement-text">Announcement notice</Label>
          <Textarea
            id="announcement-text"
            value={announcementText}
            maxLength={600}
            rows={4}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Two or three sentences — the death notice, not the life story."
          />
          <p className="text-right text-xs text-muted-foreground">
            {announcementText.length}/600
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          The announcement is never listed in search engines. It exists to be
          sent — by message, by email, by WhatsApp.
        </p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save privacy settings"}
      </Button>
    </div>
  );
}

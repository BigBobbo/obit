"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/turnstile";

/**
 * "I'll be there" (PRD v2 §2.1). Two fields, big type, one-handed on a 320 px
 * phone. No account, no message box, no confirmation email to manage.
 */
export function RsvpForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, partySize, turnstileToken }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-3 text-base text-muted-foreground">
        Thank you — the family knows to expect you.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="lg" className="mt-3 w-full text-base sm:w-auto" onClick={() => setOpen(true)}>
        I&apos;ll be there
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-md border border-border p-4">
      <div className="space-y-2">
        <Label htmlFor={`rsvp-name-${eventId}`} className="text-base">Your name</Label>
        <Input
          id={`rsvp-name-${eventId}`}
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-lg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`rsvp-size-${eventId}`} className="text-base">How many of you?</Label>
        <Input
          id={`rsvp-size-${eventId}`}
          type="number"
          min={1}
          max={12}
          inputMode="numeric"
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          className="h-12 w-24 text-lg"
        />
      </div>
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-base text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={busy || name.trim().length === 0} className="w-full text-base sm:w-auto">
        {busy ? "Sending…" : "Let the family know"}
      </Button>
    </form>
  );
}

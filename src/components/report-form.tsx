"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/turnstile";

const CATEGORIES = [
  { value: "fake_memorial", label: "Fake memorial / this person is alive" },
  { value: "impersonation_or_ownership", label: "Impersonation or ownership dispute" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "copyright", label: "Copyright (DMCA)" },
  { value: "csam_or_illegal", label: "Child safety / illegal content" },
];

export function ReportForm({
  pageRandomId,
  memoryId,
}: {
  pageRandomId: string;
  memoryId?: string;
}) {
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [evidence, setEvidence] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const needsEvidence = category === "fake_memorial" || category === "impersonation_or_ownership";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageRandomId,
          memoryId,
          category,
          reporterEmail: email,
          relationship,
          evidence,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Report received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you. We may follow up at the email address you provided. Reports
          that don&apos;t receive a reply to follow-up questions close after 30 days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="category">What&apos;s wrong?</Label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>Choose a reason…</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Your email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {needsEvidence && (
        <>
          <div className="space-y-2">
            <Label htmlFor="relationship">Your relationship to this person</Label>
            <Input
              id="relationship"
              required
              placeholder="e.g. daughter, brother, close friend"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evidence">What can you tell us that we can verify?</Label>
            <Textarea
              id="evidence"
              required
              minLength={20}
              placeholder="Details that help us confirm your report…"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </div>
        </>
      )}
      {!needsEvidence && (
        <div className="space-y-2">
          <Label htmlFor="evidence">Anything else we should know? (optional)</Label>
          <Textarea id="evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
        </div>
      )}
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || !category} className="w-full">
        {busy ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}

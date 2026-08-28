"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/turnstile";

export function JoinForm({ pageRandomId, pageName }: { pageRandomId: string; pageName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/steward-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageRandomId, name, email, relationship, message, turnstileToken }),
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
        <h2 className="font-serif text-xl">Request sent</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve let the family looking after {pageName} know. They&apos;ll
          email you at {email} with their decision.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="j-name">Your name</Label>
        <Input id="j-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="j-email">Your email</Label>
        <Input id="j-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="j-rel">Your relationship to {pageName}</Label>
        <Input
          id="j-rel"
          required
          minLength={3}
          maxLength={300}
          placeholder="e.g. daughter, brother, close friend"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="j-msg">Anything you&apos;d like to say to the family (optional)</Label>
        <Textarea id="j-msg" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}

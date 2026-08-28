"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ReportResponseForm({ reportId, token }: { reportId: string; token: string }) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response }),
      });
      const data = await res.json().catch(() => ({}));
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
        <h2 className="font-serif text-xl">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your reply is with the Memorial Pages team. We&apos;ll be in touch if
          we need anything else.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="r-response">Your reply</Label>
        <Textarea
          id="r-response"
          required
          maxLength={4000}
          rows={8}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || response.trim().length === 0} className="w-full">
        {busy ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}

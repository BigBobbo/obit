"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/turnstile";

const MAX_PHOTOS = 10;
const MAX_TEXT = 2000;

type Step = "compose" | "verify" | "done";

export function ShareForm({
  pageId,
  randomId,
  pageName,
}: {
  pageId: string;
  randomId: string;
  pageName: string;
}) {
  const [step, setStep] = useState<Step>("compose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [skippedVerification, setSkippedVerification] = useState(false);

  async function submitMemory(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("pageId", pageId);
      form.set("name", name);
      form.set("email", email);
      form.set("body", body);
      form.set("turnstileToken", turnstileToken);
      files.slice(0, MAX_PHOTOS).forEach((f) => form.append("photos", f));

      const res = await fetch("/api/memories", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMemoryId(data.memoryId);
      if (data.verified) {
        // Returning contributor with approval history: re-verification skipped.
        setSkippedVerification(true);
        setPublished(data.status === "approved");
        setStep("done");
      } else {
        setStep("verify");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/memories/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That code didn't work. Please try again.");
        return;
      }
      setPublished(data.status === "approved");
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {published
            ? `Your memory is now visible on the page for ${pageName}.`
            : `Your memory has been received. The family reviews contributions before they appear.`}
          {skippedVerification ? "" : " We've also emailed you a confirmation."}
        </p>
        <Button asChild className="mt-4">
          <Link href={`/m/${randomId}`}>Back to the page</Link>
        </Button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={submitCode} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to
          confirm your memory.
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em]"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
          {busy ? "Confirming…" : "Confirm"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitMemory} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Your name (as it will appear)</Label>
        <Input id="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Your email (never shown publicly)</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Your memory</Label>
        <Textarea
          id="body"
          maxLength={MAX_TEXT}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A story, a moment, a few words…"
        />
        <p className="text-right text-xs text-muted-foreground">{body.length}/{MAX_TEXT}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="photos">Photos (up to {MAX_PHOTOS})</Label>
        <Input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS))}
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">{files.length} photo(s) selected</p>
        )}
      </div>
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={busy || (body.trim().length === 0 && files.length === 0)}
        className="w-full"
      >
        {busy ? "Submitting…" : "Continue"}
      </Button>
      <p className="text-xs text-muted-foreground">
        To protect the family&apos;s privacy, memories can&apos;t contain links,
        phone numbers or addresses. Submissions are checked automatically and
        may be reviewed by the family before appearing.
      </p>
    </form>
  );
}

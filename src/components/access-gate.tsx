"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/turnstile";

/**
 * The door (PRD v2 §1.1). Grandma-first on purpose: one large field, big type,
 * no account, no password rules, and it works one-handed on a 320 px phone.
 *
 * The code path says out loud that it is a soft gate — a family deciding how
 * widely to share should not think it is a lock.
 */
export function AccessGate({
  pageId,
  pageName,
  gate,
  alreadyRequested,
}: {
  pageId: string;
  pageName: string;
  gate: "code" | "request";
  alreadyRequested?: boolean;
}) {
  return gate === "code" ? (
    <CodeGate pageId={pageId} />
  ) : (
    <RequestGate pageId={pageId} pageName={pageName} alreadyRequested={alreadyRequested} />
  );
}

function CodeGate({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/access/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That code didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 text-left"
    >
      <Label htmlFor="access-code" className="text-lg">
        Enter the access code
      </Label>
      <p className="mt-1 text-base text-muted-foreground">
        The family shared a short code — it may be on the order of service, or in
        the message that brought you here.
      </p>
      <Input
        id="access-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={100}
        placeholder="nana-rose"
        className="mt-4 h-14 text-center text-2xl"
      />
      {error && <p className="mt-3 text-base text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={busy || code.trim().length === 0} className="mt-4 w-full text-lg">
        {busy ? "Checking…" : "Open the memorial"}
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        Capital letters, spaces and dashes don&apos;t matter.
      </p>
    </form>
  );
}

function RequestGate({
  pageId,
  pageName,
  alreadyRequested,
}: {
  pageId: string;
  pageName: string;
  alreadyRequested?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/access/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, relationship, turnstileToken }),
      });
      if (res.ok) {
        setSent(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // The single sentence a requester ever sees — before a decision, after an
  // approval they haven't opened yet, and after a decline alike.
  if (sent || alreadyRequested) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 text-left">
        <h2 className="font-serif text-xl">Thank you</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Check your email and click the link to confirm your address. The family
          will review your request, and we&apos;ll email you if they add you.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-left"
    >
      <div>
        <h2 className="font-serif text-xl">Ask the family for access</h2>
        <p className="mt-1 text-base text-muted-foreground">
          {pageName}&apos;s memories are private. Tell the family who you are and
          they&apos;ll decide.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="req-name" className="text-base">Your name</Label>
        <Input id="req-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="req-email" className="text-base">Your email</Label>
        <Input
          id="req-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-lg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="req-rel" className="text-base">How did you know them?</Label>
        <Input
          id="req-rel"
          maxLength={300}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="Optional — “we worked together at the mill”"
          className="h-12 text-lg"
        />
      </div>
      <Turnstile onToken={setTurnstileToken} />
      {error && <p className="text-base text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={busy} className="w-full text-lg">
        {busy ? "Sending…" : "Ask for access"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/turnstile";

type Duplicate = { randomId: string; name: string };

export default function NewPagePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [dod, setDod] = useState("");
  const [bio, setBio] = useState("");
  const [obituaryUrl, setObituaryUrl] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(confirmDuplicate: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dateOfBirth: dob,
          dateOfDeath: dod,
          bio,
          obituaryUrl,
          turnstileToken,
          confirmDuplicate,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === "duplicate") {
        setDuplicates(data.duplicates ?? []);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/dashboard/pages/${data.pageId}`);
    } finally {
      setBusy(false);
    }
  }

  if (duplicates) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-serif text-3xl">A page may already exist</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We found {duplicates.length === 1 ? "a page" : "pages"} matching the
          same name and dates. Creating duplicates splits the family&apos;s
          memories across pages.
        </p>
        <ul className="mt-4 space-y-2">
          {duplicates.map((d) => (
            <li key={d.randomId} className="rounded-md border border-border p-4">
              <p className="font-medium">{d.name}</p>
              <div className="mt-2 flex gap-3 text-sm">
                <Link className="underline" href={`/m/${d.randomId}`}>View page</Link>
                <Link className="underline" href={`/m/${d.randomId}/report?category=ownership`}>
                  Request co-steward access / dispute ownership
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setDuplicates(null)}>Go back</Button>
          <Button variant="destructive" disabled={busy} onClick={() => submit(true)}>
            Create a separate page anyway
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-3xl">Create a memorial page</h1>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name of the deceased</Label>
          <Input id="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dod">Date of death</Label>
            <Input id="dod" type="date" required value={dod} onChange={(e) => setDod(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obit">Obituary link or funeral home reference (optional, encouraged)</Label>
          <Input
            id="obit"
            type="url"
            placeholder="https://…"
            value={obituaryUrl}
            onChange={(e) => setObituaryUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Short biography (optional — you can add this later)</Label>
          <Textarea id="bio" maxLength={10000} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <Turnstile onToken={setTurnstileToken} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create page"}
        </Button>
      </form>
    </main>
  );
}

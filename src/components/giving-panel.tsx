"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGivingTotal } from "@/lib/giving/format";
import { formatDate } from "@/lib/utils";

export type PanelCharity = { id: string; ein: string; name: string };
export type PanelDonation = {
  id: string;
  pageCharityId: string;
  amountCents: number;
  donorName: string | null;
  donorMessage: string | null;
  status: string;
  createdAt: string;
};

type SearchResult = { ein: string; name: string; description?: string | null };

/**
 * The steward's giving tab (PRD v2 §3.2): choose up to three charities, see the
 * total, and decide what the donor wall shows.
 *
 * The one thing this panel cannot do is anything to the money. Publishing or
 * hiding a donor's message changes a display; the gift is already at the
 * charity, and it stays in the total either way.
 */
export function GivingPanel({
  pageId,
  partnerName,
  charities,
  donations,
  maxCharities = 3,
}: {
  pageId: string;
  partnerName: string;
  charities: PanelCharity[];
  donations: PanelDonation[];
  maxCharities?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = donations.reduce((sum, d) => sum + d.amountCents, 0);
  const waiting = donations.filter((d) => d.status === "pending");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/charities/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setResults(data.charities ?? []);
      else setMessage(data.error ?? "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function add(ein: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/charities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ein }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(null);
        setQuery("");
        router.refresh();
      } else {
        setMessage(data.error ?? "Could not add that charity.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this charity from the page?")) return;
    const res = await fetch(`/api/page-charities/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function decide(id: string, action: "publish" | "hide") {
    const res = await fetch(`/api/donations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {charities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          If people have been asking what they can do, this is the answer that
          usually helps: name a charity that mattered to them.
        </p>
      ) : (
        <ul className="space-y-2">
          {charities.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-border p-4"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">EIN {c.ein}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {charities.length < maxCharities && (
        <form onSubmit={search} className="space-y-2 rounded-md border border-border p-4">
          <Label htmlFor="charity-q">Find a charity</Label>
          <div className="flex gap-2">
            <Input
              id="charity-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hospice, cancer research, the local animal shelter…"
            />
            <Button type="submit" disabled={busy || query.trim().length < 2}>
              Search
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Searches the registered US charity list at {partnerName}. Only
            registered 501(c)(3) charities can be named — we can&apos;t take
            gifts for a person or a family, and we never handle the money.
          </p>
          {results && results.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing matched that search.</p>
          )}
          {results && results.length > 0 && (
            <ul className="mt-2 space-y-2">
              {results.map((r) => (
                <li key={r.ein} className="flex items-start justify-between gap-3 border-t border-border pt-2">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    {r.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => add(r.ein)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {donations.length > 0 && (
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="font-serif text-lg">{formatGivingTotal(total)} given so far</p>
          <p className="text-xs text-muted-foreground">
            The page shows this total and the names below — never what any one
            person gave.
          </p>

          {waiting.length > 0 && (
            <p className="text-sm">
              <strong>{waiting.length}</strong>{" "}
              {waiting.length === 1 ? "message is" : "messages are"} waiting for you.
            </p>
          )}

          <ul className="space-y-2">
            {donations.slice(0, 25).map((d) => (
              <li key={d.id} className="border-t border-border pt-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{d.donorName ?? "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
                {d.donorMessage && (
                  <p className="whitespace-pre-wrap text-muted-foreground">{d.donorMessage}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {d.status === "published"
                      ? "Shown on the page"
                      : d.status === "hidden"
                        ? "Not shown"
                        : "Waiting for you"}
                  </span>
                  {d.status !== "published" && (
                    <Button size="sm" variant="outline" onClick={() => decide(d.id, "publish")}>
                      Show
                    </Button>
                  )}
                  {d.status !== "hidden" && (
                    <Button size="sm" variant="ghost" onClick={() => decide(d.id, "hide")}>
                      Hide
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <a href={`/api/pages/${pageId}/donations/export`} className="text-sm underline">
            Download the full list
          </a>
        </div>
      )}
    </div>
  );
}

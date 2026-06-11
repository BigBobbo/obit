"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Steward = { id: string; role: string; userId: string; email: string };

export function StewardsPanel({
  pageId,
  myRole,
  myUserId,
  stewards,
}: {
  pageId: string;
  myRole: "owner" | "co_steward";
  myUserId: string;
  stewards: Steward[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/stewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Co-steward added." : data.error ?? "Invite failed.");
      if (res.ok) {
        setEmail("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(stewardId: string) {
    if (!window.confirm("Remove this co-steward?")) return;
    const res = await fetch(`/api/pages/${pageId}/stewards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stewardId }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Removed." : data.error ?? "Remove failed.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <ul className="space-y-2">
        {stewards.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm">
            <span>
              {s.email}{" "}
              <Badge variant="muted">{s.role === "owner" ? "Owner" : "Co-steward"}</Badge>
            </span>
            {s.role !== "owner" && (myRole === "owner" || s.userId === myUserId) && (
              <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                {s.userId === myUserId ? "Leave" : "Remove"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={invite} className="mt-4 flex gap-2">
        <Input
          type="email"
          placeholder="co-steward@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={busy || !email}>Invite</Button>
      </form>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Co-stewards can moderate and edit the page, but can&apos;t delete it or
        remove the owner. All stewards are notified of changes by email.
      </p>
    </div>
  );
}

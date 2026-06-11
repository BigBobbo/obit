"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Magic-link only at launch (PRD §6): no passwords to phish or stuff.
 * Private beta: an invite code is required when BETA_INVITE_CODES is set.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Invite gate is validated server-side before the magic link is sent.
      const gate = await fetch("/api/auth/invite-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, invite }),
      });
      if (!gate.ok) {
        const data = await gate.json().catch(() => ({}));
        setError(data.error ?? "Sign-in is currently invite-only.");
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-serif">Sign in</CardTitle>
          <CardDescription>
            We&apos;ll email you a sign-in link. No password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">
              Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite">Invite code (private beta)</Label>
                <Input
                  id="invite"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="Leave blank if you have an account"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Sending…" : "Email me a sign-in link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

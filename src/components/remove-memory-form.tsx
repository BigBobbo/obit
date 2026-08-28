"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Confirmation step for the removal link in a contributor's receipt email.
 * The deletion itself happens on POST, so a mail scanner following the link
 * cannot remove someone's memory on their behalf.
 */
export function RemoveMemoryForm({
  memoryId,
  token,
}: {
  memoryId: string;
  token: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setState("busy");
    setError(null);
    try {
      const res = await fetch(
        `/api/memories/${memoryId}/remove?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (res.ok) {
        setState("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "We couldn't remove this memory. Please try again.");
      setState("idle");
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div>
        <h1 className="font-serif text-2xl">Your memory has been removed</h1>
        <p className="mt-4 text-muted-foreground">
          It is no longer visible on the memorial page, and any photos you
          shared with it have been deleted.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl">Remove your memory?</h1>
      <p className="mt-4 text-muted-foreground">
        This takes your memory off the page, along with any photos you shared
        with it. It can&apos;t be undone — you&apos;d need to submit again.
      </p>
      <div className="mt-8">
        <Button variant="destructive" onClick={remove} disabled={state === "busy"}>
          {state === "busy" ? "Removing…" : "Remove my memory"}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}

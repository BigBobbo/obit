import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl tracking-tight">Memorial Pages</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A quiet, unlisted page where family and friends share photos and
        memories of someone they loved. Reached only by a link or a QR code —
        never by search.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/login">Create a memorial page</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Steward sign in</Link>
        </Button>
      </div>
      <ul className="mt-12 space-y-2 text-sm text-muted-foreground">
        <li>Unlisted by design — no directory, no search engines</li>
        <li>Family-moderated contributions with automated safety checks</li>
        <li>QR codes for graveside plaques and memorial cards</li>
      </ul>
      <footer className="mt-16 text-xs text-muted-foreground">
        <Link href="/legal/terms" className="underline">Terms</Link>
        {" · "}
        <Link href="/legal/privacy" className="underline">Privacy</Link>
      </footer>
    </main>
  );
}

export const metadata = { title: "Privacy Policy — Memorial Pages" };

export default function PrivacyPage() {
  return (
    <main className="prose mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="font-serif text-lg text-foreground">What we collect</h2>
        <p>
          Account emails (stewards), contributor emails (verified per
          submission, never shown publicly), the content you submit, and basic
          technical data (IP addresses for rate limiting and abuse prevention).
        </p>
        <h2 className="font-serif text-lg text-foreground">Unlisted by design</h2>
        <p>
          Memorial pages are excluded from search engines (noindex), have
          non-guessable addresses, and are never listed in any public directory.
          Anyone with the exact link can view a page — choose who you share it with.
        </p>
        <h2 className="font-serif text-lg text-foreground">Photos</h2>
        <p>
          All uploaded photos are re-encoded on our servers, which removes
          embedded metadata such as GPS location. Originals are stored privately
          and only web-sized copies are served publicly.
        </p>
        <h2 className="font-serif text-lg text-foreground">Service providers</h2>
        <p>
          We use Supabase (hosting, database, storage), Vercel (hosting),
          Cloudflare (security, including child-safety scanning of uploads),
          Sightengine and Anthropic (automated content moderation), Resend
          (email) and Stripe (payments). Each receives only the data needed for
          its function.
        </p>
        <h2 className="font-serif text-lg text-foreground">Cookies</h2>
        <p>
          We use strictly necessary cookies: your sign-in session and, if you
          contribute, a token that remembers your verified email. No advertising
          or cross-site tracking cookies.
        </p>
        <h2 className="font-serif text-lg text-foreground">Deletion</h2>
        <p>
          Stewards can delete pages (30-day recovery window, then purged).
          Contributors can remove their memory via the link in their
          confirmation email, or email support@example.com.
        </p>
      </div>
    </main>
  );
}

export const metadata = { title: "Terms of Service — Memorial Pages" };

export default function TermsPage() {
  return (
    <main className="prose mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Memorial Pages lets families create unlisted memorial pages and lets
          visitors contribute photos and written memories. By using the service
          you agree to these terms.
        </p>
        <h2 className="font-serif text-lg text-foreground">Acceptable use</h2>
        <p>
          You may only create a memorial page for a person who has died and whom
          you have a genuine connection to. Creating pages for living people,
          impersonating others, harassment, spam, and unlawful content are
          prohibited and lead to removal and account bans.
        </p>
        <h2 className="font-serif text-lg text-foreground">Content and moderation</h2>
        <p>
          Contributions pass automated safety checks and may be reviewed by the
          page&apos;s stewards before publishing. We may remove content or
          freeze pages in response to reports. You retain rights to content you
          submit and grant us a license to host and display it on the relevant
          memorial page.
        </p>
        <h2 className="font-serif text-lg text-foreground">Copyright (DMCA)</h2>
        <p>
          Copyright complaints can be submitted via the &quot;Report&quot; link
          on any page (category: Copyright) or by email to our designated agent
          at dmca@example.com. Include the information required by 17 U.S.C. §512(c)(3).
        </p>
        <h2 className="font-serif text-lg text-foreground">Deletion</h2>
        <p>
          Page owners can delete a page at any time; deleted pages are
          recoverable for 30 days and then permanently purged. Contributors can
          request removal of their own memory via the link in their confirmation
          email.
        </p>
        <h2 className="font-serif text-lg text-foreground">Billing</h2>
        <p>
          Paid subscriptions are billed through Stripe and can be cancelled any
          time via the customer portal. Safety features are never paywalled.
        </p>
        <p>Questions: support@example.com.</p>
      </div>
    </main>
  );
}

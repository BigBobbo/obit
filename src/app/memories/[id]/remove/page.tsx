import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RemoveMemoryForm } from "@/components/remove-memory-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Landing page for the removal link in a contributor's receipt email.
 *
 * This page only confirms; the deletion happens on POST from the form. The
 * token is not checked here — doing so would let anyone probe which tokens are
 * valid by loading the page, and the API route validates it anyway.
 */
export default async function RemoveMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <RemoveMemoryForm memoryId={id} token={token} />
    </main>
  );
}

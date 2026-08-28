import { createAdminClient } from "@/lib/supabase/admin";
import { deleteMemoryPhotos } from "@/lib/images";

/**
 * Takes a memory off the page — from the moderation queue, from a report, or
 * at the contributor's own request.
 *
 * Photo bytes go with it. Web renditions live in a *public* bucket, so
 * flipping the row's status hides it from the feed while leaving every
 * rendition fetchable by URL indefinitely.
 */
export async function removeMemory(
  memoryId: string,
  opts: {
    blockContributorOnPage?: { pageId: string; email: string };
    /**
     * Take back the contributor's approval credit. Set when a steward removes
     * a memory that was published: `approved_count` gates auto-publish across
     * the whole platform, so a contributor whose memory was taken down must
     * not keep the credit it earned. Left alone when a contributor withdraws
     * their own memory — that is not a mark against them.
     */
    revokeApproval?: boolean;
  } = {},
): Promise<void> {
  const admin = createAdminClient();

  const { data: memory } = await admin
    .from("memories")
    .select("status, contributor_email")
    .eq("id", memoryId)
    .maybeSingle();

  await admin.from("memories").update({ status: "rejected" }).eq("id", memoryId);
  await deleteMemoryPhotos(memoryId);

  // Only a memory that actually counted can be uncounted.
  if (opts.revokeApproval && memory?.status === "approved") {
    const { error } = await admin.rpc("unbump_approved_count", {
      p_email: memory.contributor_email,
    });
    if (error) console.error("failed to revoke approval credit", error);
  }

  if (opts.blockContributorOnPage) {
    await admin.from("contributor_page_blocks").upsert({
      page_id: opts.blockContributorOnPage.pageId,
      email: opts.blockContributorOnPage.email,
    });
  }
}

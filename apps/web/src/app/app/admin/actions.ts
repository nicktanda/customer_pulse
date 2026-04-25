"use server";

// This file contains server actions for the admin area.
// Server actions run on the server (not the browser) and can safely touch the database.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import {
  feedbacks,
  UserRole,
  FeedbackSource,
  FeedbackStatus,
} from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser } from "@/lib/current-project";
import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";
import { QUEUE_DEFAULT } from "@/lib/queue-names";

/**
 * createFeedbackAction: takes data from the "Create Feedback" form and inserts a
 * row into the `feedbacks` table. Only admin users can call this action.
 *
 * The `formData` argument comes automatically from the HTML <form> element when the
 * user submits it — Next.js wires this up for us.
 */
export async function createFeedbackAction(formData: FormData) {
  // Check the user is logged in and is an admin
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.admin) {
    redirect("/app?error=forbidden");
  }

  const userId = Number(session.user.id);
  const projectId = await getCurrentProjectIdForUser(userId);

  if (!projectId) {
    redirect("/app/admin?error=no_project");
  }

  // Pull each field out of the form submission
  const content = formData.get("content")?.toString().trim() ?? "";
  const title = formData.get("title")?.toString().trim() || null;
  const authorName = formData.get("author_name")?.toString().trim() || null;
  const authorEmail = formData.get("author_email")?.toString().trim() || null;
  // Parse the numeric enum values from the select dropdowns
  const category = parseInt(formData.get("category")?.toString() ?? "0", 10);
  const priority = parseInt(formData.get("priority")?.toString() ?? "0", 10);

  if (!content) {
    redirect("/app/admin?error=missing_content");
  }

  const db = await getRequestDb();
  const now = new Date();

  // Insert the feedback row — using FeedbackSource.custom (3) so it shows up like
  // feedback from the public API, not tied to any real integration.
  const [inserted] = await db
    .insert(feedbacks)
    .values({
      projectId,
      source: FeedbackSource.custom,
      title,
      content,
      authorName,
      authorEmail,
      category,
      priority,
      status: FeedbackStatus.new_feedback,
      // Mark in raw_data that this was manually created so we can identify it later
      rawData: { _manual: true, _created_by: session.user.email },
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: feedbacks.id });

  // Enqueue the AI processing job if Redis is available.
  // If Redis isn't running locally, this will silently fail — that's fine.
  if (inserted) {
    try {
      const q = new Queue(QUEUE_DEFAULT, { connection: getRedis() });
      await q.add(
        "process_feedback",
        { feedbackId: inserted.id },
        { removeOnComplete: 1000, removeOnFail: 5000 },
      );
    } catch {
      // Redis is optional in local dev — feedback is still saved without it
    }
  }

  // Redirect back to the admin page with a success message
  redirect("/app/admin?notice=created");
}

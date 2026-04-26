import { redirect } from "next/navigation";

/**
 * /app/learn/ root — redirect to Insights which is the primary entry point for Learn mode.
 * Per design doc, the dashboard at /app is also a Learn-mode page, so /app/learn/
 * existing as a permanent redirect avoids a 404 if someone navigates here directly.
 */
export default function LearnIndexPage() {
  redirect("/app/learn/insights");
}

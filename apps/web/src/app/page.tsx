import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Landing: send signed-in users to the app shell, others to login. */
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }
  redirect("/login");
}

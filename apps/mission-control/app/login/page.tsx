/**
 * Legacy /login route — redirects to Clerk-managed /sign-in.
 * Kept so any bookmarks or hard-coded links continue to work.
 */
import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/sign-in");
}

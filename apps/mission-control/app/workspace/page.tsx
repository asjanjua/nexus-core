import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function WorkspaceEntryPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard/ceo");
  }

  redirect("/sign-in?redirect_url=/dashboard/ceo");
}

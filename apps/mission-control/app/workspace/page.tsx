import { redirect } from "next/navigation";

export default async function WorkspaceEntryPage() {
  redirect("/sign-in?redirect_url=/dashboard/ceo");
}

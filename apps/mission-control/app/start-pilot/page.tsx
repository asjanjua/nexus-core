import { redirect } from "next/navigation";

export default async function StartPilotPage() {
  redirect("/sign-up?redirect_url=/onboarding");
}

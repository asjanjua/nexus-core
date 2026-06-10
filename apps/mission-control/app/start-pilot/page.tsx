import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function StartPilotPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/onboarding");
  }

  redirect("/sign-up?redirect_url=/onboarding");
}

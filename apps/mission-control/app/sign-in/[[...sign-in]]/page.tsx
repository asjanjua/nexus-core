import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#101a2f] border border-white/10 shadow-none",
            headerTitle: "text-white",
            headerSubtitle: "text-white/60",
            socialButtonsBlockButton:
              "border border-white/20 bg-white/5 text-white hover:bg-white/10",
            formFieldLabel: "text-white/70",
            formFieldInput:
              "bg-black/30 border border-white/20 text-white placeholder:text-white/40",
            formButtonPrimary: "bg-[#2ed3b7] text-black hover:bg-[#28bba3]",
            footerActionLink: "text-[#2ed3b7] hover:text-[#28bba3]",
          },
        }}
      />
    </div>
  );
}

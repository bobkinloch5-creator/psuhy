import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding-flow"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: user } = await supabase.from("users").select("*").eq("auth_id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  // If already completed onboarding, go to dashboard
  if (user.onboarding_completed) {
    redirect("/dashboard")
  }

  return <OnboardingFlow user={user} />
}

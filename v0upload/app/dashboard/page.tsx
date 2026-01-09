import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: user } = await supabase.from("users").select("*").eq("auth_id", authUser.id).single()

  if (!user) {
    redirect("/auth/login")
  }

  // Get recent assets
  const { data: recentAssets } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6)

  // Get favorite assets
  const { data: favoriteAssets } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_favorite", true)
    .order("created_at", { ascending: false })
    .limit(4)

  // Check if onboarding is needed
  if (!user.onboarding_completed) {
    redirect("/onboarding")
  }

  return <DashboardContent user={user} recentAssets={recentAssets || []} favoriteAssets={favoriteAssets || []} />
}

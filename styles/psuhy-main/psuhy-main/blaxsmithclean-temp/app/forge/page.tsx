import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ForgeInterface } from "@/components/forge-interface"

export default async function ForgePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*, projects!active_project_id(*)")
    .eq("discord_id", user.id)
    .single()

  // If user not found in DB, create a minimal user object from auth data
  if (userError || !userData) {
    console.log("[Forge] User not in database yet, using auth data:", user.id)

    const minimalUserData = {
      id: user.id,
      discord_id: user.id,
      username: user.user_metadata?.global_name || user.email?.split('@')[0] || 'User',
      avatar: user.user_metadata?.avatar_url,
      email: user.email || '',
      generation_credits: 50,
      model_credits: 50,
      world_credits: 50,
      subscription_tier: 'free',
      is_admin: false
    }

    return <ForgeInterface user={minimalUserData} />
  }

  // Allow access even without active project - user can create one in the interface
  return <ForgeInterface user={userData} />
}

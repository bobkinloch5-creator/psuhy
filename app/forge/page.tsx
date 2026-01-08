import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
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

  // Use service client to bypass RLS for reliable user lookup
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  // Try to find user by discord_id first (which stores the supabase auth id)
  let { data: userData, error: userError } = await serviceClient
    .from("users")
    .select("*, projects!active_project_id(*)")
    .eq("discord_id", user.id)
    .single()

  // If not found by discord_id, try by id (for backwards compatibility)
  if (userError || !userData) {
    const result = await serviceClient
      .from("users")
      .select("*, projects!active_project_id(*)")
      .eq("id", user.id)
      .single()

    userData = result.data
    userError = result.error
  }

  // If still not found, create the user
  if (userError || !userData) {
    console.log("[Forge] Creating new user in database:", user.id)

    const newUserData = {
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

    // Actually insert the user into the database
    const { data: insertedUser, error: insertError } = await serviceClient
      .from("users")
      .insert(newUserData)
      .select("*")
      .single()

    if (insertError) {
      console.error("[Forge] User creation error:", insertError)
      // Fall back to minimal user data for UI
      return <ForgeInterface user={newUserData} />
    }

    console.log("[Forge] User created successfully")
    return <ForgeInterface user={insertedUser} />
  }

  // User found - return with actual database credits
  return <ForgeInterface user={userData} />
}

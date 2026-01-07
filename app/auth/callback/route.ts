import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!code) {
    console.error("[Auth Callback] No code provided")
    return NextResponse.redirect(new URL("/?error=no_code", origin))
  }

  try {
    // Exchange code for session
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error("[Auth Callback] Session exchange error:", sessionError)
      return NextResponse.redirect(new URL("/?error=session_failed", origin))
    }

    if (!data.user) {
      console.error("[Auth Callback] No user data")
      return NextResponse.redirect(new URL("/?error=no_user", origin))
    }

    // Use service role to bypass RLS for user creation
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

    // Check if user exists
    const { data: existingUser } = await serviceClient
      .from("users")
      .select("id, discord_id")
      .eq("discord_id", data.user.id)
      .single()

    if (!existingUser) {
      console.log("[Auth Callback] Creating new user for:", data.user.id)

      // Create new user with service role
      const { error: insertError } = await serviceClient.from("users").insert({
        discord_id: data.user.id,
        username:
          data.user.user_metadata?.global_name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          "User",
        avatar: data.user.user_metadata?.avatar_url,
        email: data.user.email,
        generation_credits: 50,
        model_credits: 50,
        world_credits: 50,
        subscription_tier: "free",
        is_admin: false,
        last_login: new Date().toISOString(),
      })

      if (insertError) {
        console.error("[Auth Callback] User creation error:", insertError)
        return NextResponse.redirect(new URL("/?error=user_creation_failed", origin))
      }

      console.log("[Auth Callback] User created successfully")
    } else {
      console.log("[Auth Callback] Updating existing user:", existingUser.id)

      // Update last login
      await serviceClient
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", existingUser.id)
    }

    // SUCCESS - Redirect to forge dashboard
    console.log("[Auth Callback] Redirecting to /forge")
    return NextResponse.redirect(new URL("/forge", origin))
  } catch (error) {
    console.error("[Auth Callback] Unexpected error:", error)
    return NextResponse.redirect(new URL("/?error=auth_failed", origin))
  }
}

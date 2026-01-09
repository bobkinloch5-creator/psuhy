import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// GET - Fetch current user credits
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Use service client to bypass RLS
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Get user by discord_id
        const { data: userData, error } = await serviceClient
            .from("users")
            .select("generation_credits, model_credits, world_credits, subscription_tier")
            .eq("discord_id", user.id)
            .single()

        if (error || !userData) {
            // Try by id
            const { data: userData2, error: error2 } = await serviceClient
                .from("users")
                .select("generation_credits, model_credits, world_credits, subscription_tier")
                .eq("id", user.id)
                .single()

            if (error2 || !userData2) {
                return NextResponse.json({ error: "User not found" }, { status: 404 })
            }

            return NextResponse.json(userData2)
        }

        return NextResponse.json(userData)
    } catch (error) {
        console.error("[Credits API] Error:", error)
        return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 })
    }
}

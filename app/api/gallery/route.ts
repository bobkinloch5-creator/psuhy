import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
    try {
        // Use server-side Supabase client for auth (same as model generation API)
        const supabaseAuth = await createClient()
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

        if (authError || !user) {
            console.log("[Gallery] Auth error:", authError?.message || "No user")
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        // Use service client for database operations
        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

        const { data: models, error } = await supabase
            .from("creations")
            .select("*")
            .eq("user_id", user.id)
            .eq("type", "3d-model")
            .order("created_at", { ascending: false })
            .limit(50)

        if (error) {
            console.error("[Gallery] Error fetching models:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        // Transform to expected format
        const formattedModels = (models || []).map(m => ({
            id: m.id,
            name: m.name || m.prompt || "Untitled Model",
            prompt: m.prompt || "",
            style: m.style || "realistic",
            model_url: m.asset_data?.model_url || m.asset_data?.formats?.glb || null,
            preview_url: m.asset_data?.preview_url || m.preview_url || null,
            created_at: m.created_at
        }))

        return NextResponse.json({
            success: true,
            models: formattedModels,
            count: formattedModels.length
        })

    } catch (error: any) {
        console.error("[Gallery] Error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

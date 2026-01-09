import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Use server-side Supabase client for auth (same as model generation API)
        const supabaseAuth = await createClient()
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

        if (authError || !user) {
            console.log("[Gallery] Delete auth error:", authError?.message || "No user")
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        // Use service client for database operations
        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

        const { error } = await supabase
            .from("creations")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id)

        if (error) {
            console.error("[Gallery] Error deleting model:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error("[Gallery] Delete error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

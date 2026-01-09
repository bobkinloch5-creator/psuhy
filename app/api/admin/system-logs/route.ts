import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check admin
        const { data: userData } = await serviceClient
            .from("users")
            .select("is_admin")
            .eq("discord_id", user.id)
            .single()

        if (!userData?.is_admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get recent credit transactions
        const { data: creditLogs } = await serviceClient
            .from("credit_transactions")
            .select("*, users(username)")
            .order("created_at", { ascending: false })
            .limit(50)

        // Get recent creations as generation logs
        const { data: generationLogs } = await serviceClient
            .from("creations")
            .select("id, type, name, status, created_at, user_id, users(username)")
            .order("created_at", { ascending: false })
            .limit(50)

        // Get recent user logins
        const { data: loginLogs } = await serviceClient
            .from("users")
            .select("id, username, last_login, created_at")
            .not("last_login", "is", null)
            .order("last_login", { ascending: false })
            .limit(30)

        return NextResponse.json({
            creditLogs: creditLogs || [],
            generationLogs: generationLogs || [],
            loginLogs: loginLogs || []
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

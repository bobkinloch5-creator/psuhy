import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get user from cookies
        const { cookies } = await import("next/headers")
        const cookieStore = await cookies()

        const supabaseClient = createClient(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        cookie: cookieStore.toString(),
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        // Delete the model (only if owned by user)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

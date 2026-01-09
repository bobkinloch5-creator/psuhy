import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

// GET - List all promo codes
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

        const { data: codes } = await serviceClient
            .from("promo_codes")
            .select("*")
            .order("created_at", { ascending: false })

        return NextResponse.json({ codes: codes || [] })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create new promo code
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { credits, maxUses, expiresAt, code: customCode } = await request.json()

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

        // Generate code if not provided
        const promoCode = customCode || `BLAX-${randomBytes(4).toString("hex").toUpperCase()}`

        const { data: newCode, error } = await serviceClient
            .from("promo_codes")
            .insert({
                code: promoCode,
                credits: credits || 50,
                max_uses: maxUses || 100,
                current_uses: 0,
                expires_at: expiresAt || null,
                is_active: true,
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, code: newCode })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Deactivate promo code
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const codeId = searchParams.get("id")

        if (!codeId) {
            return NextResponse.json({ error: "Code ID required" }, { status: 400 })
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

        await serviceClient
            .from("promo_codes")
            .update({ is_active: false })
            .eq("id", codeId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
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
        const { data: adminData } = await serviceClient
            .from("users")
            .select("is_admin, id")
            .eq("id", user.id)
            .single()

        if (!adminData?.is_admin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        // Prevent self-deletion
        if (userId === adminData.id) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
        }

        // Get user info before deletion
        const { data: targetUser } = await serviceClient
            .from("users")
            .select("username, email, is_admin")
            .eq("id", userId)
            .single()

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Prevent deleting other admins
        if (targetUser.is_admin) {
            return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 400 })
        }

        // Delete user's related data first (ignore errors if tables don't exist)
        try { await serviceClient.from("creations").delete().eq("user_id", userId) } catch { }
        try { await serviceClient.from("credit_transactions").delete().eq("user_id", userId) } catch { }
        try { await serviceClient.from("user_ips").delete().eq("user_id", userId) } catch { }
        try { await serviceClient.from("promo_redemptions").delete().eq("user_id", userId) } catch { }

        // Delete the user
        const { error } = await serviceClient
            .from("users")
            .delete()
            .eq("id", userId)

        if (error) {
            throw error
        }

        // Log the action
        try {
            await serviceClient.from("security_logs").insert({
                action: "delete_user",
                details: {
                    deleted_user_id: userId,
                    deleted_username: targetUser.username,
                    admin_id: adminData.id
                },
                ip_address: request.headers.get("x-forwarded-for") || "unknown"
            })
        } catch { }

        return NextResponse.json({
            success: true,
            message: `User ${targetUser.username} has been permanently deleted`
        })

    } catch (error: any) {
        console.error("[Delete User] Error:", error)
        return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 })
    }
}

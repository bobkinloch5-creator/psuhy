import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Use service client for admin operations
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check if current user is admin
        const { data: adminUser } = await serviceClient
            .from("users")
            .select("is_admin, id")
            .eq("discord_id", user.id)
            .single()

        if (!adminUser?.is_admin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { userId, banned, reason } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 })
        }

        // Get the target user's info including their known IPs
        const { data: targetUser } = await serviceClient
            .from("users")
            .select("id, discord_id, username")
            .eq("id", userId)
            .single()

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Update the user's ban status
        const { error: banError } = await serviceClient
            .from("users")
            .update({ is_banned: banned })
            .eq("id", userId)

        if (banError) throw banError

        // If banning, also ban all their known IPs
        if (banned) {
            // Get all IPs associated with this user
            const { data: userIps } = await serviceClient
                .from("user_ips")
                .select("ip_address, fingerprint")
                .eq("user_id", userId)

            // Ban each IP and fingerprint
            if (userIps && userIps.length > 0) {
                const bannedIps = userIps.map(ip => ({
                    ip_address: ip.ip_address,
                    fingerprint: ip.fingerprint,
                    user_id: userId,
                    discord_id: targetUser.discord_id,
                    reason: reason || "Banned by admin",
                    banned_by: adminUser.id
                }))

                // Insert banned IPs (ignore conflicts)
                await serviceClient
                    .from("banned_ips")
                    .upsert(bannedIps, { onConflict: 'ip_address', ignoreDuplicates: true })
            }

            // Log the ban action
            await serviceClient
                .from("security_logs")
                .insert({
                    event_type: "ban",
                    user_id: userId,
                    details: {
                        reason,
                        banned_by: adminUser.id,
                        username: targetUser.username,
                        ips_banned: userIps?.length || 0
                    }
                })
        } else {
            // If unbanning, remove their IPs from banned list
            await serviceClient
                .from("banned_ips")
                .delete()
                .eq("user_id", userId)

            // Log the unban action
            await serviceClient
                .from("security_logs")
                .insert({
                    event_type: "unban",
                    user_id: userId,
                    details: {
                        unbanned_by: adminUser.id,
                        username: targetUser.username
                    }
                })
        }

        return NextResponse.json({
            success: true,
            message: banned
                ? `${targetUser.username} has been banned (IP ban included)`
                : `${targetUser.username} has been unbanned`
        })
    } catch (error) {
        console.error("[Admin] Ban user error:", error)
        return NextResponse.json({ error: "Failed to update ban status" }, { status: 500 })
    }
}

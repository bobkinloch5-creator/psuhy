import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { AdminPanel } from "@/components/admin-panel"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Use service client to bypass RLS
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if user is admin
  const { data: userData } = await serviceClient
    .from("users")
    .select("is_admin, username")
    .eq("discord_id", user.id)
    .single()

  if (!userData?.is_admin) {
    redirect("/forge")
  }

  // Get platform statistics
  const { count: totalUsers } = await serviceClient.from("users").select("*", { count: "exact", head: true })

  const { count: totalCreations } = await serviceClient.from("creations").select("*", { count: "exact", head: true })

  const { count: activeToday } = await serviceClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_login", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get suspicious activity count
  const { count: suspiciousCount } = await serviceClient
    .from("suspicious_activity")
    .select("*", { count: "exact", head: true })
    .eq("resolved", false)

  // Get all users
  const { data: allUsers } = await serviceClient
    .from("users")
    .select("id, username, email, discord_id, avatar, generation_credits, subscription_tier, created_at, last_login, is_banned")
    .order("created_at", { ascending: false })
    .limit(100)

  // Get recent transactions
  const { data: recentTransactions } = await serviceClient
    .from("credit_transactions")
    .select("*, users(username)")
    .order("created_at", { ascending: false })
    .limit(20)

  // Get suspicious activity
  const { data: suspiciousActivity } = await serviceClient
    .from("suspicious_activity")
    .select("*, users(username)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get recent creations/generations for pipeline
  const { data: recentCreations } = await serviceClient
    .from("creations")
    .select("id, prompt, type, status, created_at, user_id, users(username)")
    .order("created_at", { ascending: false })
    .limit(20)

  // Get generation stats by type
  const { data: modelCreations } = await serviceClient
    .from("creations")
    .select("*", { count: "exact", head: true })
    .eq("type", "3d_model")

  const { data: scriptCreations } = await serviceClient
    .from("creations")
    .select("*", { count: "exact", head: true })
    .eq("type", "script")

  const { data: chatCreations } = await serviceClient
    .from("creations")
    .select("*", { count: "exact", head: true })
    .eq("type", "chat")

  // Get security logs (if table exists)
  let securityLogs: any[] = []
  try {
    const { data: logs } = await serviceClient
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
    securityLogs = logs || []
  } catch (e) {
    // Table might not exist yet
  }

  // Get banned users count
  const { count: bannedCount } = await serviceClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_banned", true)

  // Get banned IPs count (if table exists)
  let bannedIPsCount = 0
  try {
    const { count } = await serviceClient
      .from("banned_ips")
      .select("*", { count: "exact", head: true })
    bannedIPsCount = count || 0
  } catch (e) {
    // Table might not exist yet
  }

  return (
    <AdminPanel
      adminUser={{
        username: userData.username,
        id: user.id
      }}
      stats={{
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        totalCreations: totalCreations || 0,
        suspiciousCount: suspiciousCount || 0,
        bannedUsers: bannedCount || 0,
        bannedIPs: bannedIPsCount || 0
      }}
      users={allUsers || []}
      transactions={recentTransactions || []}
      suspiciousActivity={suspiciousActivity || []}
      generations={recentCreations || []}
      securityLogs={securityLogs}
      generationStats={{
        models: (modelCreations as any)?.count || 0,
        scripts: (scriptCreations as any)?.count || 0,
        chats: (chatCreations as any)?.count || 0
      }}
    />
  )
}

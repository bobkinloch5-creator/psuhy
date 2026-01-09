import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, Activity, AlertTriangle, CreditCard, TrendingUp } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("is_admin, username")
    .eq("discord_id", user.id)
    .single()

  if (!userData?.is_admin) {
    redirect("/forge")
  }

  // Get platform statistics
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true })

  const { count: totalCreations } = await supabase.from("creations").select("*", { count: "exact", head: true })

  const { count: activeToday } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_login", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Get recent suspicious activity
  const { data: suspiciousActivity } = await supabase
    .from("suspicious_activity")
    .select("*, users(username)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get recent credit transactions
  const { data: recentTransactions } = await supabase
    .from("credit_transactions")
    .select("*, users(username)")
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: allUsers } = await supabase
    .from("users")
    .select("id, username, discord_id, avatar, generation_credits, subscription_tier, created_at, last_login")
    .order("created_at", { ascending: false })
    .limit(50)

  const getDiscordAvatarUrl = (discordId: string, avatar: string | null) => {
    if (!avatar) return null
    if (avatar.startsWith("http")) return avatar
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=64`
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome back, {userData.username}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{totalUsers || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Members</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-500" />
              <span className="text-xs text-muted-foreground">24h</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{activeToday || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Active Today</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <span className="text-xs text-muted-foreground">All Time</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{totalCreations || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Generations</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <span className="text-xs text-muted-foreground">Unresolved</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{suspiciousActivity?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Suspicious Activity</div>
          </div>
        </div>

        {/* Suspicious Activity */}
        {suspiciousActivity && suspiciousActivity.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Suspicious Activity (Unresolved)
            </h2>
            <div className="space-y-3">
              {suspiciousActivity.map((activity: any) => (
                <div
                  key={activity.id}
                  className={`p-4 rounded-lg border-2 ${
                    activity.severity === "critical"
                      ? "bg-red-500/10 border-red-500/30"
                      : activity.severity === "high"
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-yellow-500/10 border-yellow-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{activity.users?.username || "Unknown"}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          activity.severity === "critical"
                            ? "bg-red-500 text-white"
                            : activity.severity === "high"
                              ? "bg-orange-500 text-white"
                              : "bg-yellow-500 text-black"
                        }`}
                      >
                        {activity.severity.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Type: {activity.activity_type.replace(/_/g, " ")}</div>
                  {activity.ip_address && (
                    <div className="text-xs text-muted-foreground mt-1">IP: {activity.ip_address}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit Transactions */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Recent Credit Transactions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Balance</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Reason</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions?.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="p-2 text-sm">{tx.users?.username || "Unknown"}</td>
                    <td className="p-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tx.transaction_type === "deduction"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="p-2 text-sm font-mono">{tx.amount}</td>
                    <td className="p-2 text-sm font-mono">
                      {tx.balance_before} → {tx.balance_after}
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">{tx.reason}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            All Members ({totalUsers})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Tier</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Credits</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {allUsers?.map((u: any) => {
                  const avatarUrl = getDiscordAvatarUrl(u.discord_id, u.avatar)
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarImage src={avatarUrl || undefined} alt={u.username} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
                              {u.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                          {u.subscription_tier || "free"}
                        </span>
                      </td>
                      <td className="p-2 text-sm font-mono">{u.generation_credits}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

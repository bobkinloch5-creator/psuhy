"use client"

import { useState } from "react"
import { Shield, Users, Sparkles, Database, TrendingUp, Search, Gift, Ban, Crown, Bell, RefreshCw, Trash2, Eye, Settings, BarChart3, AlertTriangle } from "lucide-react"

interface User {
    id: string
    username: string
    email: string
    generation_credits: number
    subscription_tier: string
    subscription_status: string
    is_admin: boolean
    is_banned?: boolean
    created_at: string
}

interface AdminDashboardProps {
    users: User[]
    stats: {
        totalUsers: number
        totalCreations: number
        activeSubscriptions: number
    }
}

export function AdminDashboard({ users, stats }: AdminDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filterTier, setFilterTier] = useState<string>("all")
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showGiftModal, setShowGiftModal] = useState(false)
    const [showBanModal, setShowBanModal] = useState(false)
    const [showTierModal, setShowTierModal] = useState(false)
    const [giftAmount, setGiftAmount] = useState(100)
    const [newTier, setNewTier] = useState("pro")
    const [actionLoading, setActionLoading] = useState(false)
    const [announcement, setAnnouncement] = useState("")
    const [showAnnouncement, setShowAnnouncement] = useState(false)

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesTier = filterTier === "all" || user.subscription_tier === filterTier
        return matchesSearch && matchesTier
    })

    // Admin Actions
    const handleGiftCredits = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/gift-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.id, amount: giftAmount })
            })
            if (res.ok) {
                alert(`✅ Gifted ${giftAmount} credits to ${selectedUser.username}!`)
                window.location.reload()
            } else {
                alert("❌ Failed to gift credits")
            }
        } catch (e) {
            alert("❌ Error: " + e)
        }
        setActionLoading(false)
        setShowGiftModal(false)
    }

    const handleBanUser = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/ban-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.id, banned: !selectedUser.is_banned })
            })
            if (res.ok) {
                alert(`✅ ${selectedUser.is_banned ? "Unbanned" : "Banned"} ${selectedUser.username}!`)
                window.location.reload()
            } else {
                alert("❌ Failed to update ban status")
            }
        } catch (e) {
            alert("❌ Error: " + e)
        }
        setActionLoading(false)
        setShowBanModal(false)
    }

    const handleChangeTier = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/change-tier", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.id, tier: newTier })
            })
            if (res.ok) {
                alert(`✅ Changed ${selectedUser.username}'s tier to ${newTier.toUpperCase()}!`)
                window.location.reload()
            } else {
                alert("❌ Failed to change tier")
            }
        } catch (e) {
            alert("❌ Error: " + e)
        }
        setActionLoading(false)
        setShowTierModal(false)
    }

    const handleResetCredits = async (user: User) => {
        if (!confirm(`Reset ${user.username}'s credits to default?`)) return
        try {
            const defaultCredits = user.subscription_tier === "pro" ? 100 : user.subscription_tier === "enterprise" ? 500 : 50
            const res = await fetch("/api/admin/gift-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, amount: defaultCredits, reset: true })
            })
            if (res.ok) {
                alert(`✅ Reset ${user.username}'s credits to ${defaultCredits}!`)
                window.location.reload()
            }
        } catch (e) {
            alert("❌ Error: " + e)
        }
    }

    const handleSendAnnouncement = async () => {
        if (!announcement.trim()) return
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/announcement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: announcement })
            })
            if (res.ok) {
                alert("✅ Announcement sent to all users!")
                setAnnouncement("")
                setShowAnnouncement(false)
            }
        } catch (e) {
            alert("❌ Error: " + e)
        }
        setActionLoading(false)
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10">
                <div className="px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white">Admin Control Center</h1>
                                <p className="text-sm text-gray-400">Full system access • {users.length} users managed</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAnnouncement(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:opacity-90 transition"
                        >
                            <Bell className="w-5 h-5" />
                            Send Announcement
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Users</p>
                                <p className="text-3xl font-black text-blue-400">{stats.totalUsers}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Creations</p>
                                <p className="text-3xl font-black text-purple-400">{stats.totalCreations}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-900/30 to-green-950/50 border border-green-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Active Subs</p>
                                <p className="text-3xl font-black text-green-400">{stats.activeSubscriptions}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-900/30 to-orange-950/50 border border-orange-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Conversion</p>
                                <p className="text-3xl font-black text-orange-400">
                                    {stats.totalUsers > 0 ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-orange-400" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => { setSelectedUser(null); setShowGiftModal(true) }}
                            className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 hover:bg-green-500/20 transition"
                        >
                            <Gift className="w-5 h-5" />
                            <span className="font-bold">Gift Credits</span>
                        </button>
                        <button
                            onClick={() => window.location.href = "/admin/creations"}
                            className="flex items-center justify-center gap-2 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-500/20 transition"
                        >
                            <Eye className="w-5 h-5" />
                            <span className="font-bold">View Creations</span>
                        </button>
                        <button
                            onClick={() => window.location.href = "/admin/analytics"}
                            className="flex items-center justify-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition"
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="font-bold">Analytics</span>
                        </button>
                        <button
                            onClick={() => setShowAnnouncement(true)}
                            className="flex items-center justify-center gap-2 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 hover:bg-orange-500/20 transition"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="font-bold">Announcement</span>
                        </button>
                    </div>
                </div>

                {/* Users Section */}
                <div className="bg-card border border-border rounded-2xl shadow-2xl">
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Database className="w-6 h-6 text-orange-400" />
                                User Management
                            </h2>
                            <span className="text-sm text-gray-400">{filteredUsers.length} users shown</span>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                            <select
                                value={filterTier}
                                onChange={(e) => setFilterTier(e.target.value)}
                                className="px-4 py-3 bg-input border border-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                                <option value="all">All Tiers</option>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Credits</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tier</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-muted/50 transition-colors ${user.is_banned ? 'opacity-50 bg-red-500/5' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.is_admin ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'}`}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {user.username}
                                                        {user.is_admin && <Shield className="w-4 h-4 text-red-400" />}
                                                        {user.is_banned && <Ban className="w-4 h-4 text-red-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.email || "N/A"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`font-bold ${user.generation_credits > 99999 ? 'text-yellow-400' : user.generation_credits > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {user.generation_credits > 99999 ? "∞" : user.generation_credits}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${user.subscription_tier === "enterprise"
                                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                    : user.subscription_tier === "pro"
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                        : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                                                    }`}
                                            >
                                                {user.subscription_tier.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${user.is_banned
                                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                                    : user.subscription_status === "active"
                                                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                                        : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                                                    }`}
                                            >
                                                {user.is_banned ? "BANNED" : user.subscription_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowGiftModal(true) }}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition"
                                                    title="Gift Credits"
                                                >
                                                    <Gift className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowTierModal(true) }}
                                                    className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition"
                                                    title="Change Tier"
                                                >
                                                    <Crown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleResetCredits(user)}
                                                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition"
                                                    title="Reset Credits"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(user); setShowBanModal(true) }}
                                                    className={`p-2 rounded-lg transition ${user.is_banned ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                                                    title={user.is_banned ? "Unban User" : "Ban User"}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-gray-400">No users found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Gift Credits Modal */}
            {showGiftModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Gift className="w-5 h-5 text-green-400" />
                            Gift Credits
                        </h3>
                        {selectedUser && (
                            <p className="text-gray-400 mb-4">Gifting to: <span className="text-white font-bold">{selectedUser.username}</span></p>
                        )}
                        <input
                            type="number"
                            value={giftAmount}
                            onChange={(e) => setGiftAmount(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-white mb-4"
                            placeholder="Amount of credits"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowGiftModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGiftCredits}
                                disabled={actionLoading || !selectedUser}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {actionLoading ? "Gifting..." : "Gift Credits"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            {selectedUser.is_banned ? "Unban User" : "Ban User"}
                        </h3>
                        <p className="text-gray-400 mb-4">
                            Are you sure you want to {selectedUser.is_banned ? "unban" : "ban"} <span className="text-white font-bold">{selectedUser.username}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBanModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={actionLoading}
                                className={`flex-1 px-4 py-3 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 ${selectedUser.is_banned ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                            >
                                {actionLoading ? "Processing..." : selectedUser.is_banned ? "Unban" : "Ban"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Tier Modal */}
            {showTierModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-purple-400" />
                            Change Subscription Tier
                        </h3>
                        <p className="text-gray-400 mb-4">
                            User: <span className="text-white font-bold">{selectedUser.username}</span> (Current: {selectedUser.subscription_tier})
                        </p>
                        <select
                            value={newTier}
                            onChange={(e) => setNewTier(e.target.value)}
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-white mb-4"
                        >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTierModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangeTier}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {actionLoading ? "Updating..." : "Change Tier"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcement Modal */}
            {showAnnouncement && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-orange-400" />
                            Send System Announcement
                        </h3>
                        <textarea
                            value={announcement}
                            onChange={(e) => setAnnouncement(e.target.value)}
                            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-white mb-4 h-32 resize-none"
                            placeholder="Enter your announcement message..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAnnouncement(false)}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendAnnouncement}
                                disabled={actionLoading || !announcement.trim()}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {actionLoading ? "Sending..." : "Send to All Users"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

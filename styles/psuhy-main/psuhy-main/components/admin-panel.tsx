"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
    LayoutDashboard, Users, Box, Plug, Settings, LogOut,
    Search, Ban, Gift, Eye, ChevronDown, TrendingUp, Activity,
    AlertTriangle, CreditCard, RefreshCw, Trash2, CheckCircle,
    XCircle, Shield, Zap, Database, Server, BarChart3, Tag,
    Layers, FileText, Music, Download
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface AdminPanelProps {
    adminUser: {
        username: string
        id: string
    }
    stats: {
        totalUsers: number
        activeToday: number
        totalCreations: number
        suspiciousCount: number
        bannedUsers?: number
        bannedIPs?: number
    }
    users: any[]
    transactions: any[]
    suspiciousActivity: any[]
    generations?: any[]
    securityLogs?: any[]
    generationStats?: {
        models: number
        scripts: number
        chats: number
    }
}

type ActiveTab = "dashboard" | "users" | "generations" | "analytics" | "promo" | "bulk" | "logs" | "plugin" | "settings"


export function AdminPanel({ adminUser, stats, users, transactions, suspiciousActivity, generations = [], securityLogs = [], generationStats = { models: 0, scripts: 0, chats: 0 } }: AdminPanelProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [giftAmount, setGiftAmount] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [actionResult, setActionResult] = useState<{ type: "success" | "error", message: string } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/")
    }

    const handleBanUser = async (userId: string, username: string) => {
        if (!confirm(`Are you sure you want to ban ${username}? This will also ban their IP addresses.`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/ban-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, banned: true, reason: "Banned by admin" })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: data.message || `${username} has been banned (IP ban included)` })
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to ban user")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message || "Failed to ban user" })
        }
        setIsLoading(false)
    }

    const handleUnbanUser = async (userId: string, username: string) => {
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/ban-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, banned: false })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: data.message || `${username} has been unbanned` })
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to unban user")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message || "Failed to unban user" })
        }
        setIsLoading(false)
    }

    const handleGiftCredits = async (userId: string, username: string) => {
        const amount = parseInt(giftAmount)
        if (!amount || amount <= 0) {
            setActionResult({ type: "error", message: "Please enter a valid credit amount" })
            return
        }
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/gift-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, amount })
            })
            const data = await res.json()
            if (res.ok) {
                // Show old balance → new balance for visual feedback
                const msg = data.data
                    ? `✨ Gifted ${amount} credits to ${username} (${data.data.oldCredits} → ${data.data.newCredits})`
                    : `Gifted ${amount} credits to ${username}`
                setActionResult({ type: "success", message: msg })
                setGiftAmount("")
                setSelectedUser(null)
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to gift credits")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message || "Failed to gift credits" })
        }
        setIsLoading(false)
    }

    // === PROMO CODES ===
    const [promoCode, setPromoCode] = useState("")
    const [promoCredits, setPromoCredits] = useState("50")
    const [promoMaxUses, setPromoMaxUses] = useState("100")
    const [promoCodes, setPromoCodes] = useState<any[]>([])

    const handleCreatePromo = async () => {
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/promo-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: promoCode || undefined,
                    credits: parseInt(promoCredits) || 50,
                    maxUses: parseInt(promoMaxUses) || 100
                })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `✅ Promo code created: ${data.code || data.promoCode?.code}` })
                setPromoCode("")
                fetchPromoCodes()
            } else {
                throw new Error(data.error || "Failed to create promo code")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    const fetchPromoCodes = async () => {
        try {
            const res = await fetch("/api/admin/promo-codes")
            const data = await res.json()
            if (data.promoCodes) setPromoCodes(data.promoCodes)
        } catch (e) {
            console.log("Promo codes table may not exist yet")
        }
    }

    // === BULK CREDITS ===
    const [bulkAmount, setBulkAmount] = useState("")
    const [bulkTier, setBulkTier] = useState("free")
    const [tierBulkAmount, setTierBulkAmount] = useState("")

    const handleBulkGiftAll = async () => {
        if (!bulkAmount || parseInt(bulkAmount) <= 0) {
            setActionResult({ type: "error", message: "Enter a valid credit amount" })
            return
        }
        if (!confirm(`⚠️ Gift ${bulkAmount} credits to ALL ${stats.totalUsers} users?`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/bulk-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "gift_all", amount: parseInt(bulkAmount) })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `✅ Gifted ${bulkAmount} credits to ${data.affected || stats.totalUsers} users` })
                setBulkAmount("")
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to gift bulk credits")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    const handleBulkGiftTier = async () => {
        if (!tierBulkAmount || parseInt(tierBulkAmount) <= 0) {
            setActionResult({ type: "error", message: "Enter a valid credit amount" })
            return
        }
        if (!confirm(`⚠️ Gift ${tierBulkAmount} credits to all ${bulkTier.toUpperCase()} users?`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/bulk-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "gift_tier", amount: parseInt(tierBulkAmount), tier: bulkTier })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `✅ Gifted ${tierBulkAmount} credits to ${data.affected || 0} ${bulkTier} users` })
                setTierBulkAmount("")
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to gift tier credits")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    const handleResetTierCredits = async (tier: string, amount: number) => {
        if (!confirm(`⚠️ Reset ALL ${tier} users to ${amount} credits?`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/bulk-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_tier", tier })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `✅ Reset ${data.affected || 0} ${tier} users to default credits` })
                router.refresh()
            } else {
                throw new Error(data.error || "Failed to reset credits")
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    // === USER TIER MANAGEMENT ===
    const handleChangeTier = async (userId: string, username: string, newTier: string) => {
        if (!confirm(`Change ${username}'s tier to ${newTier}?`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/change-tier", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, tier: newTier })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `✅ ${username} is now ${newTier.toUpperCase()}` })
                router.refresh()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    // === DELETE USER ===
    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`⚠️ PERMANENTLY DELETE ${username}? This cannot be undone!`)) return
        if (!confirm(`Are you REALLY sure? Type YES in the next prompt to confirm.`)) return
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: "success", message: `🗑️ ${username} has been deleted` })
                router.refresh()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            setActionResult({ type: "error", message: error.message })
        }
        setIsLoading(false)
    }

    // Load promo codes on mount
    useEffect(() => {
        fetchPromoCodes()
    }, [])

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const sidebarItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "users", label: "Users", icon: Users },
        { id: "generations", label: "Generations", icon: Box },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "promo", label: "Promo Codes", icon: Tag },
        { id: "bulk", label: "Bulk Credits", icon: Layers },
        { id: "logs", label: "System Logs", icon: FileText },
        { id: "plugin", label: "Plugin", icon: Plug },
        { id: "settings", label: "Settings", icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900/50 border-r border-white/10 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <Link href="/forge" className="flex items-center gap-3">
                        <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={40} height={40} />
                        <div>
                            <h1 className="text-lg font-bold text-white">BlaxSmith</h1>
                            <p className="text-xs text-red-400 font-semibold">ADMIN</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {sidebarItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as ActiveTab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                                ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Admin Info */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">{adminUser.username}</p>
                            <p className="text-red-400 text-xs">Owner</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Action Result Toast */}
                {actionResult && (
                    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${actionResult.type === "success" ? "bg-green-500/90" : "bg-red-500/90"
                        } text-white`}>
                        {actionResult.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        {actionResult.message}
                        <button onClick={() => setActionResult(null)} className="ml-2 hover:opacity-70">×</button>
                    </div>
                )}

                {/* Header */}
                <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
                    <div className="px-8 py-6">
                        <h1 className="text-2xl font-bold text-white">
                            {activeTab === "dashboard" && "Dashboard Overview"}
                            {activeTab === "users" && "User Management"}
                            {activeTab === "generations" && "Generation Management"}
                            {activeTab === "analytics" && "Analytics & Insights"}
                            {activeTab === "promo" && "Promo Codes"}
                            {activeTab === "bulk" && "Bulk Credit Management"}
                            {activeTab === "logs" && "System Logs"}
                            {activeTab === "plugin" && "Plugin Monitoring"}
                            {activeTab === "settings" && "System Settings"}
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            {activeTab === "dashboard" && "Real-time platform metrics and quick actions"}
                            {activeTab === "users" && "Search, ban, gift credits, and manage users"}
                            {activeTab === "generations" && "Monitor and control AI generations"}
                            {activeTab === "analytics" && "User growth, generation stats, and revenue metrics"}
                            {activeTab === "promo" && "Create and manage promotional credit codes"}
                            {activeTab === "bulk" && "Mass credit operations for tiers or all users"}
                            {activeTab === "logs" && "View recent transactions, generations, and activity"}
                            {activeTab === "plugin" && "Track plugin usage and sync events"}
                            {activeTab === "settings" && "Configure platform settings"}
                        </p>
                    </div>
                </header>

                <div className="p-8">
                    {/* Dashboard Tab */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Users className="w-10 h-10 text-blue-400" />
                                        <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">Total</span>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString()}</div>
                                    <div className="text-zinc-400 text-sm">Total Users</div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Activity className="w-10 h-10 text-green-400" />
                                        <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">24h</span>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-1">{stats.activeToday.toLocaleString()}</div>
                                    <div className="text-zinc-400 text-sm">Active Today</div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <TrendingUp className="w-10 h-10 text-purple-400" />
                                        <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">All Time</span>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-1">{stats.totalCreations.toLocaleString()}</div>
                                    <div className="text-zinc-400 text-sm">Generations</div>
                                </div>

                                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <AlertTriangle className="w-10 h-10 text-red-400" />
                                        <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full">Unresolved</span>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-1">{stats.suspiciousCount}</div>
                                    <div className="text-zinc-400 text-sm">Suspicious Activity</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => setActiveTab("users")}
                                    className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <Users className="w-6 h-6 text-blue-400" />
                                    <div className="text-left">
                                        <p className="text-white font-medium">Manage Users</p>
                                        <p className="text-zinc-400 text-xs">Ban, gift credits, view profiles</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => router.refresh()}
                                    className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <RefreshCw className="w-6 h-6 text-green-400" />
                                    <div className="text-left">
                                        <p className="text-white font-medium">Refresh Data</p>
                                        <p className="text-zinc-400 text-xs">Update all statistics</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("settings")}
                                    className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <Settings className="w-6 h-6 text-purple-400" />
                                    <div className="text-left">
                                        <p className="text-white font-medium">System Settings</p>
                                        <p className="text-zinc-400 text-xs">Configure platform</p>
                                    </div>
                                </button>
                            </div>

                            {/* Recent Credit Transactions */}
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-blue-400" />
                                        Recent Credit Transactions
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Type</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Amount</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Reason</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {transactions.slice(0, 10).map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-white/5">
                                                    <td className="p-4 text-sm text-white">{tx.users?.username || "Unknown"}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${tx.transaction_type === "deduction"
                                                            ? "bg-red-500/20 text-red-400"
                                                            : "bg-green-500/20 text-green-400"
                                                            }`}>
                                                            {tx.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-white">{tx.amount}</td>
                                                    <td className="p-4 text-sm text-zinc-400">{tx.reason}</td>
                                                    <td className="p-4 text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === "users" && (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by username or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* User List */}
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Tier</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Credits</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Joined</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredUsers.map((u: any) => (
                                                <tr key={u.id} className="hover:bg-white/5">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                                                {u.username?.charAt(0).toUpperCase() || "?"}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium">{u.username}</p>
                                                                <p className="text-zinc-500 text-xs">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                                            {u.subscription_tier || "free"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-white">{u.generation_credits}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs ${u.is_banned
                                                            ? "bg-red-500/20 text-red-400"
                                                            : "bg-green-500/20 text-green-400"
                                                            }`}>
                                                            {u.is_banned ? "Banned" : "Active"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-500">
                                                        {new Date(u.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setSelectedUser(u)}
                                                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                                title="Gift Credits"
                                                            >
                                                                <Gift className="w-4 h-4" />
                                                            </button>
                                                            {u.is_banned ? (
                                                                <button
                                                                    onClick={() => handleUnbanUser(u.id, u.username)}
                                                                    disabled={isLoading}
                                                                    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                                    title="Unban User"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleBanUser(u.id, u.username)}
                                                                    disabled={isLoading}
                                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                    title="Ban User"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Gift Credits Modal */}
                            {selectedUser && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                                        <h3 className="text-xl font-bold text-white mb-4">Gift Credits to {selectedUser.username}</h3>
                                        <p className="text-zinc-400 text-sm mb-4">
                                            Current balance: <span className="text-white font-mono">{selectedUser.generation_credits}</span> credits
                                        </p>
                                        <input
                                            type="number"
                                            placeholder="Amount to gift"
                                            value={giftAmount}
                                            onChange={(e) => setGiftAmount(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 mb-4"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setSelectedUser(null)}
                                                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleGiftCredits(selectedUser.id, selectedUser.username)}
                                                disabled={isLoading}
                                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                            >
                                                {isLoading ? "Gifting..." : "Gift Credits"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generations Tab */}
                    {activeTab === "generations" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Box className="w-8 h-8 text-orange-400" />
                                        <h3 className="text-lg font-bold text-white">Total</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-white">{stats.totalCreations.toLocaleString()}</p>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Box className="w-8 h-8 text-purple-400" />
                                        <h3 className="text-lg font-bold text-white">3D Models</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-purple-400">{generationStats.models}</p>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FileText className="w-8 h-8 text-blue-400" />
                                        <h3 className="text-lg font-bold text-white">Scripts</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-blue-400">{generationStats.scripts}</p>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Activity className="w-8 h-8 text-green-400" />
                                        <h3 className="text-lg font-bold text-white">Chat</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-green-400">{generationStats.chats}</p>
                                </div>
                            </div>

                            {/* Recent Generations Table */}
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        Recent Generations
                                    </h3>
                                </div>
                                <div className="overflow-x-auto max-h-96">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Type</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Prompt</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {generations.length > 0 ? generations.map((gen: any) => (
                                                <tr key={gen.id} className="hover:bg-white/5">
                                                    <td className="p-4 text-sm text-white">{gen.users?.username || "Unknown"}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${gen.type === "3d_model" ? "bg-purple-500/20 text-purple-400" :
                                                            gen.type === "script" ? "bg-blue-500/20 text-blue-400" :
                                                                "bg-green-500/20 text-green-400"
                                                            }`}>
                                                            {gen.type || "chat"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-zinc-400 max-w-xs truncate">{gen.prompt?.slice(0, 50) || "N/A"}...</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${gen.status === "completed" ? "bg-green-500/20 text-green-400" :
                                                            gen.status === "failed" ? "bg-red-500/20 text-red-400" :
                                                                "bg-yellow-500/20 text-yellow-400"
                                                            }`}>
                                                            {gen.status || "completed"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-500">{new Date(gen.created_at).toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-zinc-500">No generations yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Plugin Tab */}
                    {activeTab === "plugin" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Plug className="w-8 h-8 text-blue-400" />
                                        <h3 className="text-lg font-bold text-white">Plugin Status</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-green-400">Online</span>
                                    </div>
                                    <p className="text-zinc-400 text-sm mt-2">Version 1.0.0</p>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Server className="w-8 h-8 text-purple-400" />
                                        <h3 className="text-lg font-bold text-white">Active Connections</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-white">{stats.activeToday}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Plugin Sync Events</h3>
                                <p className="text-zinc-400">Real-time sync monitoring coming soon...</p>
                            </div>
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === "analytics" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <TrendingUp className="w-8 h-8 text-blue-400" />
                                        <h3 className="text-lg font-bold text-white">User Growth</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
                                    <p className="text-blue-400 text-sm mt-2">+{stats.activeToday} today</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Box className="w-8 h-8 text-purple-400" />
                                        <h3 className="text-lg font-bold text-white">Total Generations</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-white">{stats.totalCreations.toLocaleString()}</p>
                                    <p className="text-purple-400 text-sm mt-2">All-time creations</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Music className="w-8 h-8 text-green-400" />
                                        <h3 className="text-lg font-bold text-white">AI Music</h3>
                                    </div>
                                    <p className="text-4xl font-bold text-white">NEW</p>
                                    <p className="text-green-400 text-sm mt-2">Music generation via chat</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Platform Stats</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{Math.round((stats.activeToday / stats.totalUsers) * 100) || 0}%</p>
                                        <p className="text-zinc-400 text-sm">Daily Active</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-green-400">98.5%</p>
                                        <p className="text-zinc-400 text-sm">Success Rate</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-orange-400">45s</p>
                                        <p className="text-zinc-400 text-sm">Avg Gen Time</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-purple-400">{stats.suspiciousCount}</p>
                                        <p className="text-zinc-400 text-sm">Alerts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Promo Codes Tab */}
                    {activeTab === "promo" && (
                        <div className="space-y-6">
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-orange-400" />
                                    Create New Promo Code
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Code (auto-generated if empty)"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Credits"
                                        value={promoCredits}
                                        onChange={(e) => setPromoCredits(e.target.value)}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max Uses"
                                        value={promoMaxUses}
                                        onChange={(e) => setPromoMaxUses(e.target.value)}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500"
                                    />
                                    <button
                                        onClick={handleCreatePromo}
                                        disabled={isLoading}
                                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {isLoading ? "Creating..." : "Create Code"}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Active Codes ({promoCodes.length})</h3>
                                    <button onClick={fetchPromoCodes} className="text-sm text-orange-400 hover:text-orange-300">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                                {promoCodes.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-zinc-800/50">
                                                <tr>
                                                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Code</th>
                                                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Credits</th>
                                                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Uses</th>
                                                    <th className="text-left p-3 text-xs font-medium text-zinc-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {promoCodes.map((code: any) => (
                                                    <tr key={code.id} className="hover:bg-white/5">
                                                        <td className="p-3 font-mono text-orange-400">{code.code}</td>
                                                        <td className="p-3 text-white">{code.credits}</td>
                                                        <td className="p-3 text-white">{code.current_uses || 0} / {code.max_uses}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${code.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {code.is_active ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-zinc-400">No promo codes yet. Create one above!</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bulk Credits Tab */}
                    {activeTab === "bulk" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-green-400" />
                                        Gift to All Users
                                    </h3>
                                    <div className="space-y-4">
                                        <input
                                            type="number"
                                            placeholder="Credit amount"
                                            value={bulkAmount}
                                            onChange={(e) => setBulkAmount(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500"
                                        />
                                        <button
                                            onClick={handleBulkGiftAll}
                                            disabled={isLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                                        >
                                            {isLoading ? "Processing..." : `Gift to All (${stats.totalUsers} users)`}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-purple-400" />
                                        Gift by Tier
                                    </h3>
                                    <div className="space-y-4">
                                        <select
                                            value={bulkTier}
                                            onChange={(e) => setBulkTier(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white"
                                        >
                                            <option value="free">Free Users</option>
                                            <option value="pro">Pro Users</option>
                                            <option value="premium">Premium Users</option>
                                            <option value="enterprise">Enterprise Users</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Credit amount"
                                            value={tierBulkAmount}
                                            onChange={(e) => setTierBulkAmount(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-zinc-500"
                                        />
                                        <button
                                            onClick={handleBulkGiftTier}
                                            disabled={isLoading}
                                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                                        >
                                            {isLoading ? "Processing..." : "Gift to Tier"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-blue-400" />
                                    Reset Tier Credits
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        onClick={() => handleResetTierCredits("free", 30)}
                                        disabled={isLoading}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        Reset Free → 30 credits
                                    </button>
                                    <button
                                        onClick={() => handleResetTierCredits("pro", 150)}
                                        disabled={isLoading}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        Reset Pro → 150 credits
                                    </button>
                                    <button
                                        onClick={() => handleResetTierCredits("enterprise", 500)}
                                        disabled={isLoading}
                                        className="px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        Reset Enterprise → 500 credits
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Logs Tab */}
                    {activeTab === "logs" && (
                        <div className="space-y-6">
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-blue-400" />
                                        Recent Credit Transactions
                                    </h3>
                                </div>
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Type</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Amount</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Reason</th>
                                                <th className="text-left p-4 text-xs font-medium text-zinc-400 uppercase">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {transactions.slice(0, 15).map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-white/5">
                                                    <td className="p-4 text-sm text-white">{tx.users?.username || "Unknown"}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${tx.transaction_type === "deduction" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                                                            {tx.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-white">{tx.amount}</td>
                                                    <td className="p-4 text-sm text-zinc-400">{tx.reason}</td>
                                                    <td className="p-4 text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-green-400" />
                                    Recent User Logins
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {users.slice(0, 8).map((u: any) => (
                                        <div key={u.id} className="bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xs">
                                                {u.username?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium truncate">{u.username}</p>
                                                <p className="text-zinc-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === "settings" && (
                        <div className="space-y-6">
                            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-400" />
                                    System Configuration
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="text-white font-medium">Maintenance Mode</p>
                                            <p className="text-zinc-400 text-sm">Disable all user access temporarily</p>
                                        </div>
                                        <button className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors">
                                            Disabled
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="text-white font-medium">Generation Limit</p>
                                            <p className="text-zinc-400 text-sm">Max generations per minute</p>
                                        </div>
                                        <span className="text-white font-mono">100/min</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="text-white font-medium">New User Credits</p>
                                            <p className="text-zinc-400 text-sm">Default credits for new signups</p>
                                        </div>
                                        <span className="text-white font-mono">25</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

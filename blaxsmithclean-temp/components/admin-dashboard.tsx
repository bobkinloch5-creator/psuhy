"use client"

import { useState } from "react"
import { Shield, Users, Sparkles, Database, TrendingUp, Search, Filter } from "lucide-react"

interface User {
    id: string
    username: string
    email: string
    generation_credits: number
    subscription_tier: string
    subscription_status: string
    is_admin: boolean
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

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesTier = filterTier === "all" || user.subscription_tier === filterTier
        return matchesSearch && matchesTier
    })

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10">
                <div className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">Admin Panel</h1>
                            <p className="text-sm text-gray-400">Welcome back, goldbergjoe100</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
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
                        <div className="flex items-center gap-4 mb-4">
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
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Active Subs</p>
                                <p className="text-3xl font-black text-green-400">{stats.activeSubscriptions}</p>
                            </div>
                        </div>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.is_admin ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'}`}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {user.username}
                                                        {user.is_admin && <Shield className="w-4 h-4 text-red-400" />}
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
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${user.subscription_status === "active"
                                                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                                        : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                                                    }`}
                                            >
                                                {user.subscription_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString()}
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
        </div>
    )
}

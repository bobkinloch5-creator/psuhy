"use client"

import { useState } from "react"
import { User, LogOut, Mail, Shield, Sparkles } from "lucide-react"

interface SettingsInterfaceProps {
    user: any
    subscription: any
}

export function SettingsInterface({ user, subscription }: SettingsInterfaceProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        window.location.href = "/api/auth/logout"
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-black mb-8 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    Account Settings
                </h1>

                {/* User Info */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <User className="w-6 h-6 text-orange-400" />
                        Profile
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground">Username</label>
                            <p className="text-lg font-semibold">{user.username}</p>
                        </div>
                        {user.email && (
                            <div>
                                <label className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </label>
                                <p className="text-lg">{user.email}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subscription */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                        Subscription
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground">Tier</label>
                            <p className="text-lg font-semibold capitalize">{user.subscription_tier || "free"}</p>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Credits Remaining</label>
                            <div className="flex gap-4 mt-2">
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2">
                                    <div className="text-xs text-blue-400">Model Credits</div>
                                    <div className="text-xl font-bold">{user.model_credits || user.generation_credits || 0}</div>
                                </div>
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                                    <div className="text-xs text-green-400">World Credits</div>
                                    <div className="text-xl font-bold">{user.world_credits || user.generation_credits || 0}</div>
                                </div>
                                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-2">
                                    <div className="text-xs text-purple-400">Script Credits</div>
                                    <div className="text-xl font-bold">{user.generation_credits || 0}</div>
                                </div>
                            </div>
                        </div>
                        {user.is_admin && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <Shield className="w-5 h-5" />
                                    <span className="font-bold">Admin Account</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">You have unlimited credits and full access</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-2xl font-bold mb-4">Actions</h2>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                        <LogOut className="w-5 h-5" />
                        {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                </div>
            </div>
        </div>
    )
}


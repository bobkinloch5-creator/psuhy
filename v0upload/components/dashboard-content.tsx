"use client"

import { useState, useEffect } from "react"
import {
  MessageSquare,
  Box,
  Map,
  Settings,
  LogOut,
  Zap,
  Crown,
  Sparkles,
  Heart,
  Clock,
  Plug,
  CheckCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  Star,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  generation_credits: number
  model_credits: number
  world_credits: number
  subscription_tier: string
  is_admin: boolean
  plugin_connected: boolean
  plugin_token: string
}

interface Asset {
  id: string
  name: string
  description: string
  asset_type: string
  thumbnail_url: string | null
  is_favorite: boolean
  created_at: string
}

interface DashboardContentProps {
  user: User
  recentAssets: Asset[]
  favoriteAssets: Asset[]
}

export function DashboardContent({ user, recentAssets, favoriteAssets }: DashboardContentProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [pluginStatus, setPluginStatus] = useState(user.plugin_connected)
  const router = useRouter()
  const supabase = createClient()

  const isPro = user.subscription_tier && ["pro", "premium", "enterprise"].includes(user.subscription_tier)

  // Check plugin connection status periodically
  useEffect(() => {
    const checkPluginStatus = async () => {
      const { data } = await supabase
        .from("users")
        .select("plugin_connected, plugin_last_heartbeat")
        .eq("id", user.id)
        .single()

      if (data) {
        // Consider connected if heartbeat within last 30 seconds
        const lastHeartbeat = data.plugin_last_heartbeat ? new Date(data.plugin_last_heartbeat) : null
        const isConnected = lastHeartbeat && Date.now() - lastHeartbeat.getTime() < 30000
        setPluginStatus(isConnected || false)
      }
    }

    checkPluginStatus()
    const interval = setInterval(checkPluginStatus, 10000)
    return () => clearInterval(interval)
  }, [user.id, supabase])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
              BlaxSmith
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-white font-semibold">
              Dashboard
            </Link>
            <Link href="/forge/chat" className="text-white/60 hover:text-white transition-colors">
              AI Chat
            </Link>
            <Link href="/forge/models" className="text-white/60 hover:text-white transition-colors">
              3D Models
            </Link>
            <Link href="/plugin" className="text-white/60 hover:text-white transition-colors">
              Plugin
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Plugin Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                pluginStatus
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-white/10"
              }`}
            >
              {pluginStatus ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Plugin Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Plugin Offline</span>
                </>
              )}
            </div>

            {/* Credits Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-white font-semibold">{user.generation_credits}</span>
              <span className="text-white/50 text-sm hidden sm:inline">credits</span>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={user.avatar || "/placeholder.svg"}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border-2 border-orange-500/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-white font-semibold text-sm">{user.username}</p>
                <p className="text-white/50 text-xs flex items-center gap-1">
                  {isPro && <Crown className="w-3 h-3 text-yellow-500" />}
                  {user.subscription_tier || "Free"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user.username}!</h2>
          <p className="text-zinc-400">Here's what's happening with your creations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-zinc-400 text-sm">Chat Credits</span>
            </div>
            <p className="text-3xl font-bold text-white">{user.generation_credits}</p>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Box className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-zinc-400 text-sm">Model Credits</span>
            </div>
            <p className="text-3xl font-bold text-white">{user.model_credits}</p>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Map className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-zinc-400 text-sm">World Credits</span>
            </div>
            <p className="text-3xl font-bold text-white">{user.world_credits}</p>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-zinc-400 text-sm">Total Assets</span>
            </div>
            <p className="text-3xl font-bold text-white">{recentAssets.length + favoriteAssets.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/forge/chat" className="group">
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-6 hover:border-orange-500/50 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">AI Chat</h4>
                    <p className="text-zinc-400 text-sm">Get help with scripts & ideas</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-orange-400 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link href="/forge/models" className="group">
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 hover:border-yellow-500/50 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform">
                    <Box className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Generate 3D Model</h4>
                    <p className="text-zinc-400 text-sm">Create assets from text</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-yellow-400 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {!pluginStatus && (
              <Link href="/plugin" className="group">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 hover:border-green-500/50 transition-all hover:scale-[1.02]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                      <Plug className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Connect Plugin</h4>
                      <p className="text-zinc-400 text-sm">Link Roblox Studio</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-400 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )}

            {pluginStatus && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 relative">
                    <Plug className="w-7 h-7 text-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      Plugin Active
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </h4>
                    <p className="text-green-400 text-sm">Magic Sync enabled</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assets */}
        {recentAssets.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                Recent Creations
              </h3>
              <Link
                href="/assets"
                className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all group"
                >
                  <div className="aspect-square bg-zinc-800 relative">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url || "/placeholder.svg"}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    {asset.is_favorite && (
                      <div className="absolute top-2 right-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-semibold truncate">{asset.name}</p>
                    <p className="text-zinc-500 text-xs capitalize">{asset.asset_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites */}
        {favoriteAssets.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              Favorites
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-zinc-900/50 border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-500/40 transition-all group"
                >
                  <div className="aspect-video bg-zinc-800 relative">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url || "/placeholder.svg"}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold truncate">{asset.name}</p>
                    <p className="text-zinc-500 text-sm capitalize">{asset.asset_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentAssets.length === 0 && favoriteAssets.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No creations yet</h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Start generating amazing 3D models and assets for your Roblox games. Your creations will appear here.
            </p>
            <Link
              href="/forge/models"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
            >
              <Box className="w-5 h-5" />
              Generate Your First Model
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Admin Link */}
        {user.is_admin && (
          <div className="mt-8 text-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Admin Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

"use client"

import { useState } from "react"
import { MessageSquare, Box, Map, Settings, LogOut, Zap, Crown, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface User {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  email: string
  generation_credits: number
  model_credits: number
  world_credits: number
  subscription_tier: string
  is_admin: boolean
}

interface ForgeInterfaceProps {
  user: User
}

export function ForgeInterface({ user }: ForgeInterfaceProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  const isPro = user.subscription_tier && ["pro", "premium", "enterprise"].includes(user.subscription_tier)

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
              BlaxSmith Forge
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Credits Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-white font-semibold">{user.generation_credits}</span>
              <span className="text-white/50 text-sm">credits</span>
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
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Welcome back, {user.username}!</h2>
          <p className="text-zinc-400 text-lg">Choose a tool to start creating</p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* AI Chat */}
          <Link href="/forge/chat" className="group">
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl p-8 border border-white/10 hover:border-orange-500/50 transition-all hover:scale-[1.02] cursor-pointer shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Chat</h3>
              <p className="text-zinc-400">
                Chat with ForgeMind AI to get help with your Roblox projects, scripts, and ideas.
              </p>
              <div className="mt-6 flex items-center gap-2 text-orange-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                Start Chatting
              </div>
            </div>
          </Link>

          {/* 3D Model Generation */}
          <Link href="/forge/models" className="group">
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl p-8 border border-white/10 hover:border-yellow-500/50 transition-all hover:scale-[1.02] cursor-pointer shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform">
                <Box className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">3D Models</h3>
              <p className="text-zinc-400">
                Generate stunning 3D models from text descriptions. Perfect for characters, props, and more.
              </p>
              <div className="mt-6 flex items-center gap-2 text-yellow-400 font-semibold">
                <span className="text-sm bg-yellow-500/20 px-2 py-1 rounded">{user.model_credits} credits</span>
              </div>
            </div>
          </Link>

          {/* World Generation */}
          <div className="group opacity-60 cursor-not-allowed">
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl p-8 border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
                Coming Soon
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <Map className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">World Generation</h3>
              <p className="text-zinc-400">
                Create entire game environments and maps with AI. Fantasy, sci-fi, adventure - you name it.
              </p>
              <div className="mt-6 flex items-center gap-2 text-purple-400 font-semibold">
                <span className="text-sm bg-purple-500/20 px-2 py-1 rounded">{user.world_credits} credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Link */}
        {user.is_admin && (
          <div className="mt-12 text-center">
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

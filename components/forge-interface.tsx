"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Box, Map, Settings, LogOut, Zap, Crown, Sparkles, ChevronDown, Plug, ExternalLink, User, Shield, CreditCard, Home, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AIChatFullPage } from "@/components/ai-chat-fullpage"
import { BlaxSmith3DGenerator } from "@/components/blaxsmith-3d-generator"

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

type ActiveTool = "home" | "chat" | "models" | "world"

export function ForgeInterface({ user }: ForgeInterfaceProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTool, setActiveTool] = useState<ActiveTool>("home")
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  const isPro = user.subscription_tier && ["pro", "premium", "enterprise"].includes(user.subscription_tier)

  // Render the active tool content
  const renderContent = () => {
    switch (activeTool) {
      case "chat":
        return <AIChatFullPage user={user} />
      case "models":
        return <BlaxSmith3DGenerator modelCredits={user.model_credits || user.generation_credits || 0} />
      case "world":
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center">
                <Map className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">World Generation</h2>
              <p className="text-zinc-400 text-lg mb-6">Coming Soon</p>
              <p className="text-zinc-500 max-w-md mx-auto">
                Create entire game environments and maps with AI. Fantasy, sci-fi, adventure - you name it.
              </p>
            </div>
          </div>
        )
      default:
        return renderHome()
    }
  }

  const renderHome = () => (
    <>
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Welcome back, {user.username}!</h2>
        <p className="text-zinc-400 text-lg">Choose a tool to start creating</p>
      </div>

      {/* Tool Cards - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {/* AI Chat */}
        <button onClick={() => setActiveTool("chat")} className="group text-left">
          <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all hover:scale-[1.02] cursor-pointer shadow-2xl">
            {/* Image */}
            <div className="h-48 overflow-hidden">
              <img
                src="/images/ai-chat-card.png"
                alt="AI Chat"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>
            {/* Content */}
            <div className="p-6 relative">
              <div className="absolute -top-8 left-6 w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/40 border-4 border-zinc-950">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-6">AI Chat</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Chat with ForgeMind AI to get help with your Roblox projects, scripts, and ideas.
              </p>
              <div className="mt-4 flex items-center gap-2 text-cyan-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                Start Chatting
              </div>
            </div>
          </div>
        </button>

        {/* 3D Model Generation */}
        <button onClick={() => setActiveTool("models")} className="group text-left">
          <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all hover:scale-[1.02] cursor-pointer shadow-2xl">
            {/* Image */}
            <div className="h-48 overflow-hidden">
              <img
                src="/images/3d-models-card.png"
                alt="3D Models"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>
            {/* Content */}
            <div className="p-6 relative">
              <div className="absolute -top-8 left-6 w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/40 border-4 border-zinc-950">
                <Box className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-6">3D Models</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Generate stunning 3D models from text descriptions. Perfect for characters, props, and more.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-semibold">
                  {user.model_credits || user.generation_credits} credits
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* World Generation */}
        <button onClick={() => setActiveTool("world")} className="group text-left">
          <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Coming Soon Badge */}
            <div className="absolute top-4 right-4 z-10 bg-purple-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
              Coming Soon
            </div>
            {/* Image */}
            <div className="h-48 overflow-hidden opacity-70">
              <img
                src="/images/world-gen-card.png"
                alt="World Generation"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>
            {/* Content */}
            <div className="p-6 relative opacity-70">
              <div className="absolute -top-8 left-6 w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/40 border-4 border-zinc-950">
                <Map className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-6">World Generation</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Create entire game environments and maps with AI. Fantasy, sci-fi, adventure - you name it.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-semibold">
                  {user.world_credits} credits
                </span>
              </div>
            </div>
          </div>
        </button>
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
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTool !== "home" && (
              <button
                onClick={() => setActiveTool("home")}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
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

            {/* User Menu with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 transition-colors"
              >
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
                <div className="hidden md:block text-left">
                  <p className="text-white font-semibold text-sm">{user.username}</p>
                  <p className="text-white/50 text-xs flex items-center gap-1">
                    {isPro && <Crown className="w-3 h-3 text-yellow-500" />}
                    {user.subscription_tier || "Free"}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  {/* User Info Header */}
                  <div className="p-4 border-b border-white/10 bg-white/5">
                    <p className="text-white font-semibold">{user.username}</p>
                    <p className="text-zinc-400 text-sm">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${isPro ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                        {user.subscription_tier || "Free"}
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/plugin"
                      className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Plug className="w-5 h-5" />
                      Plugin Setup
                    </Link>
                    <Link
                      href="/"
                      className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Home className="w-5 h-5" />
                      Home
                    </Link>
                    <a
                      href="https://discord.gg/blaxsmith"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Discord
                    </a>
                    {user.is_admin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Shield className="w-5 h-5" />
                        Admin Panel
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      {isLoggingOut ? "Logging out..." : "Log Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={activeTool === "home" ? "container mx-auto px-6 py-12" : ""}>
        {renderContent()}
      </main>
    </div>
  )
}

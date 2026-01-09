"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Plus, Trash2, StopCircle, Undo2, Send, Sparkles, ArrowLeft, Zap, Clock, Search, Download, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import Image from "next/image"
import Link from "next/link"

// Toolbox Asset type
interface ToolboxAsset {
    id: number
    name: string
    creatorName: string
    thumbnailUrl: string
}

// HUGE Toolbox Search Card Component
function ToolboxSearchCard({ searchTerm, userId }: { searchTerm: string, userId: string }) {
    const [assets, setAssets] = useState<ToolboxAsset[]>([])
    const [loading, setLoading] = useState(true)
    const [inserting, setInserting] = useState<number | null>(null)

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const res = await fetch(`/api/toolbox/search?query=${encodeURIComponent(searchTerm)}&limit=6`)
                if (res.ok) {
                    const data = await res.json()
                    setAssets(data.assets || [])
                }
            } catch (err) {
                console.error("Toolbox search failed:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAssets()
    }, [searchTerm])

    const insertAsset = async (asset: ToolboxAsset) => {
        setInserting(asset.id)
        try {
            await fetch("/api/plugin/insert-asset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    assetId: asset.id,
                    assetName: asset.name
                })
            })
        } catch (err) {
            console.error("Insert failed:", err)
        } finally {
            setInserting(null)
        }
    }

    if (loading) {
        return (
            <div className="my-4 p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500/40 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500 rounded-xl animate-pulse">
                        <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">🔍 Searching Roblox Toolbox...</p>
                        <p className="text-sm text-purple-300">"{searchTerm}"</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-black/40 rounded-xl p-4 animate-pulse">
                            <div className="w-full h-28 bg-white/10 rounded-lg mb-3" />
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (assets.length === 0) {
        return (
            <div className="my-4 p-6 bg-gradient-to-br from-red-900/20 to-orange-900/20 border-2 border-red-500/30 rounded-2xl">
                <p className="text-red-300">❌ No assets found for "{searchTerm}"</p>
            </div>
        )
    }

    return (
        <div className="my-4 p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500/40 rounded-2xl shadow-lg shadow-purple-500/10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                    <Search className="w-7 h-7 text-white" />
                </div>
                <div>
                    <p className="text-xl font-bold text-white">🎮 Roblox Toolbox Results</p>
                    <p className="text-sm text-purple-300">Showing {assets.length} results for "{searchTerm}"</p>
                </div>
            </div>

            {/* HUGE Asset Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset) => (
                    <div
                        key={asset.id}
                        className="group bg-black/50 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
                    >
                        {/* HUGE Thumbnail */}
                        <div className="relative w-full h-32 bg-gradient-to-br from-gray-800 to-gray-900">
                            <img
                                src={asset.thumbnailUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder-model.png"
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        </div>

                        {/* Asset Info */}
                        <div className="p-4">
                            <h3 className="font-bold text-white truncate text-base mb-1">{asset.name}</h3>
                            <p className="text-xs text-white/50 mb-3">by {asset.creatorName}</p>

                            {/* BIG Insert Button */}
                            <button
                                onClick={() => insertAsset(asset)}
                                disabled={inserting === asset.id}
                                className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-500/30"
                            >
                                {inserting === asset.id ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Inserting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        Insert to Studio
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* View More Link */}
            <a
                href={`https://create.roblox.com/store/models?keyword=${encodeURIComponent(searchTerm)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
                <ExternalLink className="w-4 h-4" />
                View more on Roblox Creator Hub
            </a>
        </div>
    )
}

interface Conversation {
    id: string
    title: string
    updated_at: string
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

interface User {
    id: string
    discord_id: string
    username: string
    avatar: string | null
    email: string
    generation_credits: number
    subscription_tier?: string
    is_admin: boolean
}

export function AIChatFullPage({ user: initialUser }: { user: User }) {
    const [user, setUser] = useState(initialUser)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversation, setActiveConversation] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [selectedModel, setSelectedModel] = useState("gemini-3-flash")
    const [showSidebar, setShowSidebar] = useState(true)
    const [isConnected, setIsConnected] = useState(false)
    const [resetCountdown, setResetCountdown] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const supabase = createClient()

    // Calculate monthly reset countdown (resets on 1st of each month)
    useEffect(() => {
        const calculateResetTime = () => {
            const now = new Date()
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            const diff = nextMonth.getTime() - now.getTime()

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            if (days > 0) {
                setResetCountdown(`${days}d ${hours}h`)
            } else if (hours > 0) {
                setResetCountdown(`${hours}h ${minutes}m`)
            } else {
                setResetCountdown(`${minutes}m`)
            }
        }

        calculateResetTime()
        const interval = setInterval(calculateResetTime, 60000) // Update every minute
        return () => clearInterval(interval)
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Realtime connection status
    useEffect(() => {
        const channel = supabase.channel('connection-status')

        channel.subscribe((status: string) => {
            setIsConnected(status === 'SUBSCRIBED')
        })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        loadConversations()
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load conversations
    const loadConversations = async () => {
        const { data } = await supabase
            .from("conversations")
            .select("*")
            .order("updated_at", { ascending: false })
        if (data) setConversations(data)
    }

    // Load messages for conversation
    const loadMessages = async (conversationId: string) => {
        setActiveConversation(conversationId)
        const { data } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at")
        if (data) setMessages(data)
    }

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return
        if (user.generation_credits <= 0) {
            alert("No prompt credits remaining! Upgrade for more.")
            return
        }

        const userMessage = input.trim()
        setInput("")
        setIsLoading(true)

        // Optimistic UI - show user message immediately
        const tempUserMessage = { id: `temp-${Date.now()}`, role: "user" as const, content: userMessage }
        setMessages(prev => [...prev, tempUserMessage])

        // Optimistic credit deduction for real-time feel
        setUser(prev => ({ ...prev, generation_credits: prev.generation_credits - 1 }))

        try {
            abortControllerRef.current = new AbortController()

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: activeConversation,
                    message: userMessage,
                    model: selectedModel,
                }),
                signal: abortControllerRef.current.signal,
            })

            const data = await res.json()

            if (data.success) {
                setActiveConversation(data.conversationId)
                // Update credits from server (sync with actual value)
                if (typeof data.creditsRemaining === "number") {
                    setUser(prev => ({ ...prev, generation_credits: data.creditsRemaining }))
                }

                // Build AI response with insertion notification
                let aiResponse = data.response
                if (data.itemsQueued && data.itemsQueued.length > 0) {
                    // Add a visual notification about queued items
                    const insertionNotice = `\n\n---\n\n✅ **Sent to Roblox Studio:**\n${data.itemsQueued.map((item: string) => `- 🚀 ${item}`).join('\n')}\n\n*Check your Roblox Studio - the BlaxSmith plugin will insert these automatically!*`
                    aiResponse += insertionNotice
                }

                // Add AI response
                setMessages(prev => [
                    ...prev.filter(m => m.id !== tempUserMessage.id),
                    { id: `user-${Date.now()}`, role: "user", content: userMessage },
                    { id: `ai-${Date.now()}`, role: "assistant", content: aiResponse }
                ])
                loadConversations()
            } else {
                // Revert credit on failure
                setUser(prev => ({ ...prev, generation_credits: prev.generation_credits + 1 }))
                setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
                alert(data.error || "Failed to send message")
            }
        } catch (error: any) {
            if (error.name !== "AbortError") {
                // Revert credit on error
                setUser(prev => ({ ...prev, generation_credits: prev.generation_credits + 1 }))
                setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
                console.error("Chat error:", error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Stop generation
    const stopGeneration = () => {
        abortControllerRef.current?.abort()
        setIsLoading(false)
    }

    // Create new conversation
    const createConversation = () => {
        setActiveConversation(null)
        setMessages([])
    }

    // Delete conversation
    const deleteConversation = async (id: string) => {
        // Immediately remove from UI for instant feedback
        setConversations(prev => prev.filter(c => c.id !== id))

        if (activeConversation === id) {
            setActiveConversation(null)
            setMessages([])
        }

        // Delete from database via API (server-side to bypass RLS)
        try {
            const response = await fetch("/api/chat/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: id })
            })

            if (!response.ok) {
                const data = await response.json()
                console.error("Error deleting conversation:", data.error)
                // Re-fetch conversations to restore if delete failed
                const { data: convs } = await supabase
                    .from("conversations")
                    .select("*")
                    .order("updated_at", { ascending: false })
                if (convs) setConversations(convs)
            }
        } catch (err) {
            console.error("Delete error:", err)
        }
    }

    const isPro = user.subscription_tier && ["pro", "premium", "enterprise"].includes(user.subscription_tier)

    return (
        <div className="flex h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
            {/* Sidebar */}
            {showSidebar && (
                <div className="w-72 border-r border-white/10 bg-black/40 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10">
                        <Link href="/forge" className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">Back to Forge</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={32} height={32} className="rounded-lg" />
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                                    AI Chat
                                </h1>
                                <p className="text-xs text-white/50">Powered by ForgeMind</p>
                            </div>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full border-2 border-orange-500/50"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                                <p className="text-xs text-white/50">Discord Connected</p>
                            </div>
                        </div>
                    </div>

                    {/* Credits Display */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/60">Prompts Remaining</p>
                                    <p className={`text-xl font-bold ${user.generation_credits > 10 ? 'text-green-400' : user.generation_credits > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {user.generation_credits}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${isPro ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {user.subscription_tier?.toUpperCase() || 'FREE'}
                            </span>
                        </div>
                        {/* Reset Countdown */}
                        <div className="mt-2 pt-2 border-t border-white/5">
                            <p className="text-xs text-white/40 flex items-center gap-1">
                                <span>🔄</span>
                                <span>Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <span className="text-orange-400 ml-1">
                                    ({Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-3">
                        <button
                            onClick={createConversation}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            New Chat
                        </button>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                  ${activeConversation === conv.id
                                        ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                                        : "hover:bg-white/5 border border-transparent"}`}
                                onClick={() => loadMessages(conv.id)}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <MessageSquare className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                    <span className="text-sm text-white/80 truncate">{conv.title || "New chat"}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteConversation(conv.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Model Selector */}
                    <div className="p-3 border-t border-white/10">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-lg text-white text-sm"
                        >
                            <option value="gemini-3-flash">Gemini 3 Flash (Free)</option>
                            <option value="grok-3">Grok-3 (Fast)</option>
                            {isPro && <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 ⭐</option>}
                            {isPro && <option value="claude-sonnet-4">Claude Sonnet 4</option>}
                            {isPro && <option value="claude-haiku">Claude Haiku</option>}
                        </select>
                    </div>

                    {/* Discord Link */}
                    <div className="p-3 border-t border-white/10">
                        <a
                            href="https://discord.gg/xdFVu6cagw"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] rounded-lg transition-colors text-sm font-medium"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            </svg>
                            Join Discord
                        </a>
                        <a
                            href="https://www.youtube.com/@Blaxsmith-studio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium mt-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            YouTube
                        </a>
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <MessageSquare className="w-5 h-5 text-white/70" />
                        </button>
                        <h2 className="text-lg font-semibold text-white">
                            {activeConversation ? conversations.find(c => c.id === activeConversation)?.title || "Chat" : "New Conversation"}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                            <span className="text-xs text-white/70">{isConnected ? 'Connected' : 'Connecting...'}</span>
                        </div>
                        {/* Real-time Credit Counter */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            <span className={`font-bold ${user.generation_credits > 10 ? 'text-green-400' : user.generation_credits > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {user.generation_credits}
                            </span>
                            <span className="text-xs text-white/50">prompts</span>
                        </div>
                        {/* Monthly Reset Timer */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-white/70">Resets in</span>
                            <span className="font-bold text-purple-300">{resetCountdown}</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-6 shadow-lg shadow-orange-500/30">
                                <Sparkles className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to ForgeMind AI</h2>
                            <p className="text-white/60 max-w-md mb-6">
                                Your expert Roblox development assistant. Ask about Lua scripting, game design, assets, and more!
                            </p>
                            <div className="grid grid-cols-2 gap-3 max-w-lg">
                                {["Create a spinning coin script", "Add a sword to my game", "Make an NPC that follows players", "Design a shop system"].map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => setInput(prompt)}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/80 text-left transition-colors"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 h-fit">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === "user"
                                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                                            : "bg-white/5 border border-white/10 text-white/90"
                                            }`}
                                    >
                                        {msg.role === "assistant" ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-code:text-orange-400">
                                                {/* Parse message for [INSERT_ASSET: term] and render ToolboxSearchCards */}
                                                {(() => {
                                                    const assetPattern = /\[INSERT_ASSET:\s*([^\]]+)\]/g
                                                    const parts: React.ReactNode[] = []
                                                    let lastIndex = 0
                                                    let match

                                                    while ((match = assetPattern.exec(msg.content)) !== null) {
                                                        // Add text before this match
                                                        if (match.index > lastIndex) {
                                                            parts.push(
                                                                <ReactMarkdown key={`text-${lastIndex}`}>
                                                                    {msg.content.slice(lastIndex, match.index)}
                                                                </ReactMarkdown>
                                                            )
                                                        }
                                                        // Add the HUGE Toolbox Search Card
                                                        parts.push(
                                                            <ToolboxSearchCard
                                                                key={`toolbox-${match.index}`}
                                                                searchTerm={match[1].trim()}
                                                                userId={user.id}
                                                            />
                                                        )
                                                        lastIndex = match.index + match[0].length
                                                    }

                                                    // Add remaining text after last match
                                                    if (lastIndex < msg.content.length) {
                                                        parts.push(
                                                            <ReactMarkdown key={`text-${lastIndex}`}>
                                                                {msg.content.slice(lastIndex)}
                                                            </ReactMarkdown>
                                                        )
                                                    }

                                                    return parts.length > 0 ? parts : <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                })()}
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                                        <Sparkles className="w-5 h-5 text-white animate-pulse" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-3">
                            {isLoading && (
                                <button
                                    onClick={stopGeneration}
                                    className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                                >
                                    <StopCircle className="w-5 h-5" />
                                </button>
                            )}
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                placeholder={user.generation_credits > 0 ? "Ask ForgeMind anything about Roblox development..." : "No prompts remaining - upgrade to continue"}
                                disabled={user.generation_credits <= 0}
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim() || user.generation_credits <= 0}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                Send
                            </button>
                        </div>
                        {user.generation_credits <= 0 && (
                            <p className="text-center text-red-400 text-sm mt-2">
                                No credits remaining! <Link href="/forge" className="text-orange-400 hover:underline">Upgrade to Pro for 150 credits/month</Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

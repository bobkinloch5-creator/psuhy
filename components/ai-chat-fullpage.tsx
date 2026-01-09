"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Plus, Trash2, StopCircle, Undo2, Send, Sparkles, ArrowLeft, Zap, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import Image from "next/image"
import Link from "next/link"

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

        // Delete from database
        try {
            const { error: msgError } = await supabase.from("chat_messages").delete().eq("conversation_id", id)
            if (msgError) console.error("Error deleting messages:", msgError)

            const { error: convError } = await supabase.from("conversations").delete().eq("id", id)
            if (convError) console.error("Error deleting conversation:", convError)
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
                                                <ReactMarkdown>
                                                    {msg.content}
                                                </ReactMarkdown>
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
                                No prompts remaining! <Link href="/forge" className="text-orange-400 hover:underline">Upgrade to Pro for 100 prompts/month</Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

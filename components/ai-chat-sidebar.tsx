"use client"

import { useState } from "react"
import { MessageSquare, Plus, Trash2, X, StopCircle, Undo2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"

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

interface AIChatSidebarProps {
    userTier?: "free" | "premium" | "pro" | "enterprise"
}

export function AIChatSidebar({ userTier = "free" }: AIChatSidebarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversation, setActiveConversation] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [abortController, setAbortController] = useState<AbortController | null>(null)
    const [selectedModel, setSelectedModel] = useState("grok-3")
    const supabase = createClient()

    const allModels = [
        { id: "claude-sonnet-4", name: "Claude Sonnet 4", tier: "premium", description: "Most powerful - Best for complex code & analysis" },
        { id: "claude-haiku", name: "Claude Haiku", tier: "premium", description: "Balanced - Good quality & speed" },
        { id: "grok-3", name: "Grok-3", tier: "free", description: "Fast & witty - Great for quick questions" },
    ]

    // Filter models based on user tier
    const models = userTier === "free"
        ? allModels.filter(m => m.tier === "free")
        : allModels

    // Load conversations
    const loadConversations = async () => {
        const response = await fetch("/api/chat/conversations")
        const data = await response.json()
        if (data.conversations) {
            setConversations(data.conversations)
        }
    }

    // Load messages for conversation
    const loadMessages = async (conversationId: string) => {
        const { data } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })

        if (data) {
            setMessages(data)
        }
    }

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        setIsLoading(true)
        const userMessage = input
        setInput("")

        // Create abort controller
        const controller = new AbortController()
        setAbortController(controller)

        // Optimistically add user message
        setMessages((prev) => [...prev, { id: "temp", role: "user", content: userMessage }])

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: activeConversation,
                    message: userMessage,
                    model: selectedModel,
                }),
                signal: controller.signal,
            })

            const data = await response.json()

            if (data.success) {
                // Update conversation ID if new
                if (!activeConversation) {
                    setActiveConversation(data.conversationId)
                    await loadConversations()
                }

                // Add AI response
                setMessages((prev) => [
                    ...prev.filter((m) => m.id !== "temp"),
                    { id: "user-" + Date.now(), role: "user", content: userMessage },
                    { id: "ai-" + Date.now(), role: "assistant", content: data.response },
                ])
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("Generation stopped by user")
                setMessages((prev) => prev.filter((m) => m.id !== "temp"))
            } else {
                console.error("Failed to send message:", error)
            }
        } finally {
            setIsLoading(false)
            setAbortController(null)
        }
    }

    // Stop generation
    const stopGeneration = () => {
        if (abortController) {
            abortController.abort()
        }
    }

    // Undo last message
    const undoLast = async () => {
        if (messages.length < 2 || !activeConversation) return

        try {
            // Get last 2 messages (user + AI)
            const lastTwo = messages.slice(-2)

            // Delete from database
            for (const msg of lastTwo) {
                if (msg.id !== "temp") {
                    await supabase.from("chat_messages").delete().eq("id", msg.id)
                }
            }

            // Remove from UI
            setMessages((prev) => prev.slice(0, -2))
        } catch (error) {
            console.error("Undo error:", error)
        }
    }

    // Create new conversation
    const createConversation = async () => {
        const response = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Conversation" }),
        })

        const data = await response.json()
        if (data.conversation) {
            setActiveConversation(data.conversation.id)
            setMessages([])
            await loadConversations()
        }
    }

    // Delete conversation
    const deleteConversation = async (id: string) => {
        try {
            const response = await fetch("/api/chat/conversations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: id }),
            })

            const data = await response.json()

            if (data.success) {
                if (activeConversation === id) {
                    setActiveConversation(null)
                    setMessages([])
                }
                // Remove from local state immediately
                setConversations(prev => prev.filter(c => c.id !== id))
            } else {
                console.error("Failed to delete:", data.error)
            }
        } catch (error) {
            console.error("Delete error:", error)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => {
                    setIsOpen(true)
                    loadConversations()
                }}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-125 z-50"
            >
                <MessageSquare className="w-8 h-8 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            </button>
        )
    }

    return (
        <div className="fixed right-0 top-0 h-screen w-96 bg-card border-l border-border flex flex-col shadow-2xl z-50">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-foreground">ForgeMind AI</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={createConversation}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="New conversation"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Conversations List */}
            {!activeConversation && (
                <div className="flex-1 overflow-auto p-4 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase mb-3">Conversations</div>
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary cursor-pointer group"
                        >
                            <button
                                onClick={() => {
                                    setActiveConversation(conv.id)
                                    loadMessages(conv.id)
                                }}
                                className="flex-1 text-left"
                            >
                                <div className="font-medium text-sm truncate">{conv.title}</div>
                                <div className="text-xs text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</div>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deleteConversation(conv.id)
                                }}
                                className="p-1 hover:bg-destructive/20 rounded transition-all"
                            >
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Active Conversation */}
            {activeConversation && (
                <>
                    <div className="p-3 border-b border-border flex items-center gap-2">
                        <button
                            onClick={() => {
                                setActiveConversation(null)
                                setMessages([])
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            ← Back
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === "user"
                                        ? "bg-gradient-to-br from-orange-500 to-red-500 text-white"
                                        : "bg-secondary text-foreground"
                                        }`}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-secondary rounded-2xl px-4 py-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border">
                        {/* Action Buttons */}
                        {(isLoading || messages.length >= 2) && (
                            <div className="flex gap-2 mb-3">
                                {isLoading && (
                                    <button
                                        onClick={stopGeneration}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                                    >
                                        <StopCircle className="w-4 h-4" />
                                        Stop
                                    </button>
                                )}
                                {messages.length >= 2 && !isLoading && (
                                    <button
                                        onClick={undoLast}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Undo2 className="w-4 h-4" />
                                        Undo Last
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Model Selector */}
                        <div className="mb-3">
                            <select
                                value={selectedModel}
                                onChange={(e) => {
                                    const model = allModels.find(m => m.id === e.target.value)
                                    if (model && model.tier === "premium" && userTier === "free") {
                                        // Don't allow selection
                                        return
                                    }
                                    setSelectedModel(e.target.value)
                                }}
                                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={isLoading}
                            >
                                {allModels.map((model) => {
                                    const isLocked = model.tier === "premium" && userTier === "free"
                                    return (
                                        <option
                                            key={model.id}
                                            value={model.id}
                                            disabled={isLocked}
                                            className={isLocked ? "text-gray-500" : ""}
                                        >
                                            {isLocked ? "🔒 " : ""}{model.name} - {model.description}{isLocked ? " (Pro Only)" : ""}
                                        </option>
                                    )
                                })}
                            </select>
                            {userTier === "free" && (
                                <div className="text-xs text-orange-400 mt-1">
                                    ⬆️ Upgrade to Pro for Claude access
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Ask ForgeMind anything..."
                                className="flex-1 px-4 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="px-4 py-2 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                            Powered by {models.find(m => m.id === selectedModel)?.name || "AI"}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

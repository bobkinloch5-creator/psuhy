"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Code, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
}

interface AIChatProps {
    conversationId: string
    userId: string
}

export function AIChat({ conversationId, userId }: AIChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Load chat history
    useEffect(() => {
        loadMessages()
    }, [conversationId])

    //Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const loadMessages = async () => {
        const { data } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })

        if (data) {
            setMessages(data)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput("")
        setIsLoading(true)

        // Add user message to UI
        const tempUserMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: userMessage,
            created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, tempUserMsg])

        try {
            // Save user message to DB
            await supabase.from("chat_messages").insert({
                conversation_id: conversationId,
                role: "user",
                content: userMessage,
            })

            // Call AI API
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    conversationId,
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Add AI response to UI
                const aiMsg: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: data.message,
                    created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, aiMsg])

                // Save AI response to DB
                await supabase.from("chat_messages").insert({
                    conversation_id: conversationId,
                    role: "assistant",
                    content: data.message,
                })
            }
        } catch (error) {
            console.error("Chat error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                    <h2 className="font-bold">ForgeMind AI Assistant</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ask anything about Roblox development</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Start a conversation with your AI assistant</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[80%] rounded-xl p-4 ${msg.role === "user"
                                    ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                                    : "bg-card border border-border"
                                }`}
                        >
                            {msg.role === "assistant" ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    className="prose prose-invert prose-sm max-w-none"
                                    components={{
                                        code: ({ node, inline, ...props }) => (
                                            <code
                                                className={`${inline
                                                        ? "bg-muted px-1 py-0.5 rounded text-sm"
                                                        : "block bg-muted p-3 rounded-lg overflow-x-auto text-sm"
                                                    }`}
                                                {...props}
                                            />
                                        ),
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : (
                                <p className="text-sm">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Ask ForgeMind anything..."
                        className="flex-1 px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

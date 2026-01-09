"use client"

import { useState } from "react"
import { Plug, Loader2, Check, X } from "lucide-react"

export function PluginPairInput() {
    const [code, setCode] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")

    const handlePair = async () => {
        if (code.length !== 6) {
            setMessage("Enter 6-digit code")
            setStatus("error")
            return
        }

        setStatus("loading")

        try {
            // Get current user
            const userRes = await fetch("/api/auth/me")
            const userData = await userRes.json()

            if (!userData.user) {
                setMessage("Please log in first")
                setStatus("error")
                return
            }

            // Get discord_id from users table
            const discordId = userData.user.id

            // Pair the plugin code with user
            const res = await fetch(`/api/plugin/register?code=${code}&userId=${discordId}`)
            const data = await res.json()

            if (data.success) {
                setStatus("success")
                setMessage("Connected!")
            } else {
                setStatus("error")
                setMessage(data.error || "Invalid code")
            }
        } catch (error) {
            setStatus("error")
            setMessage("Failed")
        }
    }

    return (
        <div className="bg-gradient-to-br from-orange-900/30 to-amber-900/30 border-2 border-orange-500/40 rounded-3xl p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Plug className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Connect Plugin</h2>
                    <p className="text-orange-300/80">Enter the 6-digit code from Roblox Studio</p>
                </div>
            </div>

            <div className="flex gap-3">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        setStatus("idle")
                        setMessage("")
                    }}
                    placeholder="000000"
                    className="flex-1 text-center text-2xl font-mono tracking-[0.3em] py-4 px-6 bg-black/40 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    maxLength={6}
                />
                <button
                    onClick={handlePair}
                    disabled={status === "loading" || code.length !== 6}
                    className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {status === "loading" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : status === "success" ? (
                        <Check className="w-5 h-5" />
                    ) : status === "error" ? (
                        <X className="w-5 h-5" />
                    ) : (
                        "Pair"
                    )}
                </button>
            </div>

            {message && (
                <div className={`mt-4 text-center font-medium ${status === "success" ? "text-green-400" :
                        status === "error" ? "text-red-400" : "text-white/60"
                    }`}>
                    {message}
                </div>
            )}

            <p className="text-orange-300/50 text-sm mt-4 text-center">
                Open BlaxSmith AI in Roblox Studio to see your pairing code
            </p>
        </div>
    )
}

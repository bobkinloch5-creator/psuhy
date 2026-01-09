"use client"

import { useState } from "react"
import { Copy, Check, Eye, EyeOff } from "lucide-react"

export function PluginTokenDisplay({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  const copyToken = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maskedToken = token.slice(0, 8) + "••••••••••••••••" + token.slice(-8)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-sm text-white border border-green-500/20">
        {visible ? token : maskedToken}
      </div>
      <button
        onClick={() => setVisible(!visible)}
        className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white"
        title={visible ? "Hide token" : "Show token"}
      >
        {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
      <button
        onClick={copyToken}
        className="p-3 bg-green-500 rounded-xl hover:bg-green-400 transition-colors text-white"
        title="Copy token"
      >
        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
      </button>
    </div>
  )
}

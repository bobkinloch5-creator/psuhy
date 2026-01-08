"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react"

interface PluginStatusProps {
  userId: string
}

export function PluginStatus({ userId }: PluginStatusProps) {
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [studioInfo, setStudioInfo] = useState<any>(null)
  const [pendingAssets, setPendingAssets] = useState(0)

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [userId])

  const checkConnection = async () => {
    try {
      const response = await fetch(`/api/plugin/status?userId=${userId}`)
      const data = await response.json()

      setConnected(data.connected || false)
      setStudioInfo(data.studioInfo || null)
      setPendingAssets(data.pendingAssets || 0)
    } catch (error) {
      setConnected(false)
    } finally {
      setChecking(false)
    }
  }

  const forceSync = async () => {
    setChecking(true)
    await checkConnection()
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/40 to-purple-900/20 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
              }`}
          >
            {checking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : connected ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Roblox Studio</h3>
              {connected && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Connected</span>
              )}
            </div>
            <p className="text-sm text-white/60">
              {checking
                ? "Checking connection..."
                : connected
                  ? studioInfo?.game_name
                    ? `Game: ${studioInfo.game_name}`
                    : "Plugin active"
                  : "Install plugin to connect"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingAssets > 0 && (
            <div className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              {pendingAssets} queued
            </div>
          )}

          <button
            onClick={forceSync}
            disabled={checking}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh connection"
          >
            <RefreshCw className={`w-4 h-4 text-white/60 ${checking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!connected && !checking && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-white/60 mb-2">To connect Roblox Studio:</p>
          <ol className="text-sm text-white/80 space-y-1 ml-4 list-decimal">
            <li>Install the BlaxSmith plugin in Studio</li>
            <li>Open Studio and click the plugin icon</li>
            <li className="flex items-center gap-2 flex-wrap">
              <span>Enter your User ID:</span>
              <code className="px-2 py-0.5 bg-white/10 rounded text-purple-400">{userId}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userId)
                  const btn = document.getElementById('copy-user-id-btn')
                  if (btn) {
                    btn.textContent = '✓ Copied!'
                    setTimeout(() => { btn.textContent = '📋 Copy' }, 2000)
                  }
                }}
                id="copy-user-id-btn"
                className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded transition-colors"
              >
                📋 Copy
              </button>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}


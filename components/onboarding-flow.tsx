"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Sparkles, ArrowRight, Download, MessageSquare, Box, CheckCircle, Copy, Check, Eye, EyeOff } from "lucide-react"

interface User {
  id: string
  username: string
  plugin_token: string
}

export function OnboardingFlow({ user }: { user: User }) {
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const copyToken = async () => {
    await navigator.clipboard.writeText(user.plugin_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const completeOnboarding = async () => {
    setIsCompleting(true)
    await supabase.from("users").update({ onboarding_completed: true }).eq("id", user.id)
    router.push("/forge")
  }

  const steps = [
    {
      title: "Welcome to BlaxSmith!",
      subtitle: `Great to have you, ${user.username}`,
      content: (
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <Image
              src="/blaxsmith-logo.png"
              alt="BlaxSmith"
              fill
              className="object-contain animate-[float_4s_ease-in-out_infinite]"
              style={{ filter: "drop-shadow(0 0 40px rgba(249, 115, 22, 0.5))" }}
            />
          </div>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            You're about to unlock the power of AI-generated assets for your Roblox games. Let's get you set up in 60
            seconds.
          </p>
        </div>
      ),
    },
    {
      title: "Your Plugin Token",
      subtitle: "The key to Magic Sync",
      content: (
        <div className="max-w-md mx-auto">
          <p className="text-zinc-400 mb-6 text-center">
            This unique User ID connects Roblox Studio to your BlaxSmith account. Copy it now - you'll need it in the next
            step.
          </p>

          <div className="bg-zinc-900/80 border border-orange-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-sm text-white overflow-hidden"
                style={{ wordBreak: "break-all" }}
              >
                {tokenVisible
                  ? user.plugin_token
                  : user.plugin_token.slice(0, 8) + "••••••••" + user.plugin_token.slice(-8)}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTokenVisible(!tokenVisible)}
                className="flex-1 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors text-white font-medium flex items-center justify-center gap-2"
              >
                {tokenVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {tokenVisible ? "Hide" : "Show"}
              </button>
              <button
                onClick={copyToken}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:from-orange-400 hover:to-red-400 transition-colors text-white font-bold flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Copied!" : "Copy Token"}
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Install the Plugin",
      subtitle: "Connect Studio to BlaxSmith",
      content: (
        <div className="max-w-lg mx-auto">
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 bg-zinc-900/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold shrink-0">
                1
              </div>
              <div>
                <p className="text-white font-medium">Download the plugin</p>
                <p className="text-zinc-500 text-sm">Click below to get BlaxSmithPlugin.lua</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-zinc-900/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold shrink-0">
                2
              </div>
              <div>
                <p className="text-white font-medium">Move to plugins folder</p>
                <p className="text-zinc-500 text-sm font-mono">%LOCALAPPDATA%\Roblox\Plugins\</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-zinc-900/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold shrink-0">
                3
              </div>
              <div>
                <p className="text-white font-medium">Paste your token in the plugin</p>
                <p className="text-zinc-500 text-sm">Open Studio, click BlaxSmith, paste token</p>
              </div>
            </div>
          </div>

          <a
            href="/api/plugin/download"
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:from-orange-400 hover:to-red-400 transition-colors text-white font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Plugin
          </a>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      subtitle: "Start creating amazing things",
      content: (
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <p className="text-zinc-400 text-lg mb-8">Your account is ready! Here's what you can do now:</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <MessageSquare className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">AI Chat</p>
              <p className="text-zinc-500 text-xs">Get coding help</p>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <Box className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">3D Models</p>
              <p className="text-zinc-500 text-xs">Generate assets</p>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-orange-300 text-sm">
              <strong>Free tier:</strong> 25 AI Chat credits + 2 3D models per month
            </p>
          </div>
        </div>
      ),
    },
  ]

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-orange-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-red-600/15 via-transparent to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-orange-500" : i < step ? "w-2 bg-orange-500/50" : "w-2 bg-white/20"
                }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{currentStep.title}</h1>
            <p className="text-zinc-400">{currentStep.subtitle}</p>
          </div>

          {/* Content */}
          <div className="mb-10">{currentStep.content}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="text-zinc-400 hover:text-white transition-colors">
                Back
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                onClick={completeOnboarding}
                disabled={isCompleting}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Go to Forge
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

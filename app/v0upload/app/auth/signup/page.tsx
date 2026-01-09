"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Anvil, ArrowRight, Eye, EyeOff, CheckCircle } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            username: username,
          },
        },
      })
      if (error) throw error
      router.push("/auth/verify")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-radial from-orange-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-yellow-600/15 via-transparent to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={56} height={56} className="w-14 h-14" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
              BlaxSmith AI
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Start Creating</h1>
          <p className="text-zinc-400">Join thousands of Roblox creators</p>
        </div>

        {/* Signup Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="CoolCreator123"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="creator@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <Anvil className="w-5 h-5" />
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* What you get */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>25 free AI credits</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>5 free 3D models</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Studio plugin</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Magic Sync</span>
          </div>
        </div>
      </div>
    </div>
  )
}

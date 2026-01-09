"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Settings, Shield, LogOut, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface User {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  is_admin: boolean
}

export function ProfileDropdown({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getDiscordAvatarUrl = () => {
    if (!user.avatar) return null
    // If it's already a full URL, use it
    if (user.avatar.startsWith("http")) return user.avatar
    // Otherwise construct Discord CDN URL
    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`
  }

  const avatarUrl = getDiscordAvatarUrl()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Avatar className="size-8 ring-2 ring-orange-500/30">
          <AvatarImage src={avatarUrl || undefined} alt={user.username} />
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-sm">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-semibold text-white">{user.username}</div>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-xl overflow-hidden z-[9999]">
          <div className="p-4 border-b border-white/10 bg-gradient-to-br from-orange-500/10 to-red-600/10">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 ring-2 ring-orange-500/50">
                <AvatarImage src={avatarUrl || undefined} alt={user.username} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.username}</div>
                <div className="text-[10px] text-white/60">Discord Account</div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="w-3 h-3 text-blue-400" />
              <span>Settings</span>
            </Link>
            {user.is_admin && (
              <>
                <div className="my-1 border-t border-white/10" />
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-white/5 transition-colors"
                >
                  <Shield className="w-3 h-3 text-purple-400" />
                  <span>Admin</span>
                </Link>
              </>
            )}
            <div className="my-1 border-t border-white/10" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


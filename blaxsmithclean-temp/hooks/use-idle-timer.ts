"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Default idle timeout: 10 minutes
const IDLE_TIMEOUT = 10 * 60 * 1000

export function useIdleTimer(timeoutMs: number = IDLE_TIMEOUT) {
    const router = useRouter()
    const pathname = usePathname()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const supabase = createClient()

    // Pages that don't need idle timer
    const publicPages = ["/", "/auth", "/auth/callback", "/login", "/about", "/privacy", "/terms", "/faq"]
    const isPublicPage = publicPages.some(p => pathname === p || pathname?.startsWith("/auth"))

    const logout = useCallback(async () => {
        console.log("[IdleTimer] Session expired due to inactivity")

        // Sign out
        await supabase.auth.signOut()

        // Redirect to home/login
        router.push("/?session=expired")
    }, [router, supabase])

    const resetTimer = useCallback(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Don't set timer on public pages
        if (isPublicPage) return

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            logout()
        }, timeoutMs)
    }, [timeoutMs, logout, isPublicPage])

    useEffect(() => {
        // Skip on public pages
        if (isPublicPage) return

        // Events that reset the idle timer
        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click",
            "wheel",
        ]

        // Start the timer
        resetTimer()

        // Add event listeners
        const handleActivity = () => resetTimer()

        events.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true })
        })

        // Also reset on visibility change (user returns to tab)
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                resetTimer()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            events.forEach(event => {
                document.removeEventListener(event, handleActivity)
            })
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [resetTimer, isPublicPage])

    return { resetTimer }
}

"use client"

import { useIdleTimer } from "@/hooks/use-idle-timer"

// 10 minutes in milliseconds
const TEN_MINUTES = 10 * 60 * 1000

export function IdleTimerProvider({ children }: { children: React.ReactNode }) {
    // Initialize idle timer - logs out after 10 minutes of inactivity
    useIdleTimer(TEN_MINUTES)

    return <>{children}</>
}

"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

export function RealTimeClock() {
    const [time, setTime] = useState<Date | null>(null)

    useEffect(() => {
        // Set initial time on client
        setTime(new Date())

        const interval = setInterval(() => {
            setTime(new Date())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    if (!time) {
        return (
            <div className="flex items-center gap-2 text-white/50 text-sm">
                <Clock className="w-4 h-4" />
                <span>--:--</span>
            </div>
        )
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div className="flex items-center gap-2 text-sm">
                <span className="text-white font-mono">{formatTime(time)}</span>
                <span className="text-white/40">|</span>
                <span className="text-white/60">{formatDate(time)}</span>
            </div>
        </div>
    )
}

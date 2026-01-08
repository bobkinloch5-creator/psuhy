"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthSuccessPage() {
    const router = useRouter()

    useEffect(() => {
        const checkAuthAndRedirect = async () => {
            const supabase = createClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                // User is authenticated, redirect to forge
                router.push("/forge")
            } else {
                // Not authenticated, wait a moment and try again
                setTimeout(() => {
                    router.push("/forge")
                }, 1000)
            }
        }

        checkAuthAndRedirect()
    }, [router])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
        </div>
    )
}


import { createClient } from "@/lib/supabase/server"

// Sloyd API configuration
const SLOYD_API_BASE = "https://api.sloyd.ai/v1"

interface SloydCredentials {
    apiKey: string
    refreshToken?: string
}

/**
 * Get Sloyd credentials from admin user
 * Only goldbergjoe100 can set/update Sloyd credentials
 */
export async function getSloydCredentials(): Promise<SloydCredentials | null> {
    try {
        const supabase = await createClient()

        // Get admin user's Sloyd credentials
        const { data } = await supabase
            .from("users")
            .select("sloyd_api_key, sloyd_refresh_token, sloyd_enabled")
            .eq("is_admin", true)
            .eq("username", "goldbergjoe100")
            .single()

        if (!data || !data.sloyd_enabled || !data.sloyd_api_key) {
            return null
        }

        return {
            apiKey: data.sloyd_api_key,
            refreshToken: data.sloyd_refresh_token || undefined
        }
    } catch (error) {
        console.error("[Sloyd] Failed to get credentials:", error)
        return null
    }
}

/**
 * Save Sloyd credentials (admin only)
 */
export async function saveSloydCredentials(apiKey: string, refreshToken?: string): Promise<boolean> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from("users")
            .update({
                sloyd_api_key: apiKey,
                sloyd_refresh_token: refreshToken,
                sloyd_enabled: true
            })
            .eq("is_admin", true)
            .eq("username", "goldbergjoe100")

        return !error
    } catch (error) {
        console.error("[Sloyd] Failed to save credentials:", error)
        return false
    }
}

/**
 * Generate 3D model using Sloyd API
 */
export async function generateSloydModel(prompt: string): Promise<{
    modelId: string
    previewUrl: string
    downloadUrl: string
} | null> {
    const credentials = await getSloydCredentials()

    if (!credentials) {
        throw new Error("Sloyd not configured. Admin needs to login to Sloyd first.")
    }

    try {
        // Generate model with Sloyd API
        const response = await fetch(`${SLOYD_API_BASE}/generate`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${credentials.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt,
                format: "fbx", // Roblox-compatible format
                quality: "high"
            })
        })

        if (!response.ok) {
            throw new Error(`Sloyd API error: ${response.statusText}`)
        }

        const data = await response.json()

        return {
            modelId: data.id,
            previewUrl: data.preview_url,
            downloadUrl: data.download_url
        }
    } catch (error) {
        console.error("[Sloyd] Generation failed:", error)
        return null
    }
}

/**
 * Check if Sloyd is configured and enabled
 */
export async function isSloydEnabled(): Promise<boolean> {
    const credentials = await getSloydCredentials()
    return credentials !== null
}

// ============================================
// AUTO-REFRESH TOKEN MANAGEMENT
// ============================================

// In-memory cache for the access token
let cachedToken: string | null = null
let tokenExpiry: number = 0

/**
 * Get a fresh Sloyd access token using cookies
 * Falls back to static SLOYD_TOKEN env var if cookies don't work
 */
export async function getSloydToken(): Promise<string | null> {
    // Check if cached token is still valid (with 5 minute buffer)
    if (cachedToken && tokenExpiry > Date.now() + 300000) {
        console.log("[Sloyd] Using cached token")
        return cachedToken
    }

    // Try to get a fresh token using cookies
    const cookies = process.env.SLOYD_COOKIE || process.env.SLOYDE_COOKIES

    if (cookies) {
        try {
            console.log("[Sloyd] Attempting to refresh token using cookies...")

            const response = await fetch("https://app.sloyd.ai/api/auth/session", {
                method: "GET",
                headers: {
                    "Cookie": cookies,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                    "Referer": "https://app.sloyd.ai/",
                },
            })

            if (response.ok) {
                const data = await response.json()

                if (data.accessToken) {
                    cachedToken = `Bearer ${data.accessToken}`
                    // Set expiry to 23 hours from now (tokens last ~24 hours)
                    tokenExpiry = Date.now() + (23 * 60 * 60 * 1000)
                    console.log("[Sloyd] Token refreshed successfully!")
                    return cachedToken
                }
            }

            console.log("[Sloyd] Cookie refresh failed, using static token")
        } catch (error) {
            console.error("[Sloyd] Token refresh error:", error)
        }
    }

    // Fall back to static token from environment
    const staticToken = process.env.SLOYD_TOKEN
    if (staticToken) {
        // Ensure it has Bearer prefix
        cachedToken = staticToken.startsWith("Bearer ") ? staticToken : `Bearer ${staticToken}`
        return cachedToken
    }

    console.error("[Sloyd] No token available - set SLOYD_TOKEN or SLOYD_COOKIE")
    return null
}

/**
 * Clear the cached token (useful after auth errors)
 */
export function clearSloydTokenCache(): void {
    cachedToken = null
    tokenExpiry = 0
    console.log("[Sloyd] Token cache cleared")
}

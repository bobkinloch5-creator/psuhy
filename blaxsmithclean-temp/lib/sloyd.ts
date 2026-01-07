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

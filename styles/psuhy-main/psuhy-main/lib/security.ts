import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

// Get client IP from request headers (works with Vercel/Cloudflare)
export function getClientIP(request: NextRequest | Request): string {
    const headers = request.headers

    // Vercel forwards the real IP in x-forwarded-for or x-real-ip
    const forwarded = headers.get("x-forwarded-for")
    const realIp = headers.get("x-real-ip")
    const cfConnecting = headers.get("cf-connecting-ip") // Cloudflare

    if (cfConnecting) return cfConnecting
    if (realIp) return realIp
    if (forwarded) return forwarded.split(",")[0].trim()

    return "unknown"
}

// Get browser fingerprint hint from headers
export function getFingerprint(request: NextRequest | Request): string {
    const headers = request.headers
    const userAgent = headers.get("user-agent") || ""
    const acceptLang = headers.get("accept-language") || ""
    const acceptEnc = headers.get("accept-encoding") || ""

    // Simple fingerprint based on available headers
    const raw = `${userAgent}|${acceptLang}|${acceptEnc}`

    // Create a simple hash
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }

    return hash.toString(16)
}

// Check if IP is banned
export async function isIPBanned(ip: string, fingerprint?: string): Promise<boolean> {
    if (ip === "unknown") return false

    try {
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check if IP is banned
        const { data: bannedIp } = await serviceClient
            .from("banned_ips")
            .select("id")
            .eq("ip_address", ip)
            .limit(1)
            .single()

        if (bannedIp) return true

        // Also check fingerprint if provided
        if (fingerprint) {
            const { data: bannedFingerprint } = await serviceClient
                .from("banned_ips")
                .select("id")
                .eq("fingerprint", fingerprint)
                .limit(1)
                .single()

            if (bannedFingerprint) return true
        }

        return false
    } catch (error) {
        // Table might not exist yet or other error
        console.warn("[Security] IP ban check failed:", error)
        return false
    }
}

// Track user IP for future banning
export async function trackUserIP(userId: string, ip: string, userAgent?: string, fingerprint?: string) {
    if (ip === "unknown" || !userId) return

    try {
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Upsert user IP - update last_seen if exists, create if not
        await serviceClient
            .from("user_ips")
            .upsert({
                user_id: userId,
                ip_address: ip,
                user_agent: userAgent,
                fingerprint: fingerprint,
                last_seen: new Date().toISOString()
            }, {
                onConflict: 'user_id,ip_address',
                ignoreDuplicates: false
            })
    } catch (error) {
        // Table might not exist yet
        console.warn("[Security] IP tracking failed:", error)
    }
}

// Check if user is banned (by account or IP)
export async function isUserBanned(userId: string, ip?: string, fingerprint?: string): Promise<boolean> {
    try {
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check if user account is banned
        const { data: user } = await serviceClient
            .from("users")
            .select("is_banned")
            .eq("id", userId)
            .single()

        if (user?.is_banned) return true

        // Check IP ban
        if (ip && await isIPBanned(ip, fingerprint)) return true

        return false
    } catch (error) {
        console.warn("[Security] Ban check failed:", error)
        return false
    }
}

// Log security event
export async function logSecurityEvent(
    eventType: string,
    userId?: string,
    ip?: string,
    details?: Record<string, any>
) {
    try {
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        await serviceClient
            .from("security_logs")
            .insert({
                event_type: eventType,
                user_id: userId,
                ip_address: ip,
                details
            })
    } catch (error) {
        console.warn("[Security] Event logging failed:", error)
    }
}

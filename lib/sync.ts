import { createClient } from "@/lib/supabase/server"

/**
 * Sync Library - Manages syncing of creations to Roblox Studio
 */

export interface Creation {
    id: string
    type: "script" | "world" | "system" | "model"
    name: string
    description: string
    asset_data: any
    status: string
    synced_to_studio: boolean
    roblox_instance_path?: string
    created_at: string
}

/**
 * Get all unsynced creations for a user
 */
export async function getUnsyncedCreations(discordId: string): Promise<Creation[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .rpc("get_unsynced_creations", { user_discord_id: discordId })

    if (error) {
        console.error("[Sync] Failed to get unsynced creations:", error)
        return []
    }

    return data || []
}

/**
 * Mark creation as synced to Studio
 */
export async function markCreationSynced(
    creationId: string,
    instancePath: string
): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
        .rpc("mark_creation_synced", {
            creation_id: creationId,
            instance_path: instancePath
        })

    if (error) {
        console.error("[Sync] Failed to mark as synced:", error)
        return false
    }

    return true
}

/**
 * Get all user creations (synced and unsynced)
 */
export async function getUserCreations(userId: string): Promise<Creation[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("creations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("[Sync] Failed to get user creations:", error)
        return []
    }

    return data || []
}

/**
 * Get recent creations with user info (for gallery/showcase)
 */
export async function getRecentCreations(limit: number = 20): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("recent_creations")
        .select("*")
        .limit(limit)

    if (error) {
        console.error("[Sync] Failed to get recent creations:", error)
        return []
    }

    return data || []
}

/**
 * Update creation metadata (tags, notes, etc.)
 */
export async function updateCreationMetadata(
    creationId: string,
    metadata: Record<string, any>
): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
        .from("creations")
        .update({
            metadata,
            updated_at: new Date().toISOString()
        })
        .eq("id", creationId)

    return !error
}

/**
 * Delete a creation
 */
export async function deleteCreation(creationId: string): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
        .from("creations")
        .delete()
        .eq("id", creationId)

    return !error
}

/**
 * Search creations
 */
export async function searchCreations(
    userId: string,
    query: string,
    type?: string
): Promise<Creation[]> {
    const supabase = await createClient()

    let queryBuilder = supabase
        .from("creations")
        .select("*")
        .eq("user_id", userId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)

    if (type) {
        queryBuilder = queryBuilder.eq("type", type)
    }

    const { data, error } = await queryBuilder.order("created_at", { ascending: false })

    if (error) {
        console.error("[Sync] Search failed:", error)
        return []
    }

    return data || []
}

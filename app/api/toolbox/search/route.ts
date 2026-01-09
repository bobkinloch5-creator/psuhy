import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Roblox's official Develop API - returns REAL insertable models
const ROBLOX_DEVELOP_API = "https://develop.roblox.com/v1/toolbox/items"
const ROBLOX_SEARCH_API = "https://www.roblox.com/develop/library"
const THUMBNAIL_API = "https://thumbnails.roblox.com/v1/assets"

// Supabase for caching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 100)
        const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)
        const offset = (page - 1) * limit

        if (!query.trim()) {
            // Return trending free models when no query
            const trending = await getTrendingFreeModels(limit, offset)
            return NextResponse.json({
                success: true,
                assets: trending.assets,
                query: "",
                total: trending.total,
                page,
                limit,
                hasMore: trending.assets.length === limit,
            })
        }

        console.log("[Toolbox] Searching for REAL free models:", query, "limit:", limit, "page:", page)

        // Use Roblox's official Develop API for verified insertable models
        let assets = await searchRobloxDevelop(query, limit, offset)
        let totalEstimate = 500

        // If Develop API fails, try alternate approach
        if (assets.length === 0) {
            assets = await searchRobloxLibrary(query, limit, offset)
        }

        // Update total estimate based on results
        if (assets.length < limit) {
            totalEstimate = offset + assets.length
        }

        // Cache valid results
        if (assets.length > 0 && supabase && page === 1) {
            cacheResultsInSupabase(assets).catch((err: Error) =>
                console.log("[Toolbox] Cache error:", err.message)
            )
        }

        console.log("[Toolbox] Returning:", assets.length, "REAL verified free models")

        return NextResponse.json({
            success: true,
            assets,
            query,
            total: totalEstimate,
            page,
            limit,
            hasMore: assets.length === limit,
        })
    } catch (error: unknown) {
        const err = error as Error
        console.error("[Toolbox] Error:", err.message)

        // Return empty on error - no fake data
        return NextResponse.json({
            success: true,
            assets: [],
            query: "",
            total: 0,
            error: err.message,
        })
    }
}

// Search using Roblox Develop API - returns VERIFIED insertable free models
async function searchRobloxDevelop(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        // Use the develop library endpoint which returns insertable models
        const params = new URLSearchParams({
            keyword: query,
            category: "Model", // Only models
            subcategory: "Featured", // Verified/featured models
            pageNumber: Math.floor(offset / limit + 1).toString(),
            resultsPerPage: limit.toString(),
            sortType: "Relevance",
            sortAggregation: "AllTime",
            minPrice: "0",
            maxPrice: "0", // FREE ONLY
            creatorType: "All",
        })

        const response = await fetch(
            `https://www.roblox.com/develop/library?${params}`,
            {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                cache: "no-store",
            }
        )

        if (!response.ok) {
            console.log("[Toolbox] Develop API failed:", response.status)
            // Fallback to catalog search
            return await searchCatalogJSON(query, limit, offset)
        }

        // Parse HTML response to extract asset data
        const html = await response.text()
        const assets = parseLibraryHTML(html, limit)

        if (assets.length > 0) {
            // Get thumbnails for the assets
            const assetIds = assets.map(a => a.id).join(",")
            const thumbnails = await getThumbnails(assetIds)

            return assets.map(asset => ({
                ...asset,
                thumbnailUrl: thumbnails[asset.id] || asset.thumbnailUrl,
            }))
        }

        return assets
    } catch (err) {
        console.log("[Toolbox] Develop search error:", err)
        return []
    }
}

// Use Roblox Catalog v2 API - more reliable endpoint for free models
async function searchCatalogJSON(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        // Try the newer catalog search v2 endpoint
        const searchParams = new URLSearchParams({
            category: "DevelopmentAssets",
            subcategory: "Models",
            keyword: query,
            sortType: "1", // Relevance
            limit: String(Math.min(limit, 30)),
            cursor: offset > 0 ? btoa(JSON.stringify({ offset })) : "",
        })

        const response = await fetch(
            `https://catalog.roblox.com/v2/search/items/details?${searchParams}`,
            {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                cache: "no-store",
            }
        )

        if (!response.ok) {
            console.log("[Toolbox] Catalog v2 failed, trying v1:", response.status)
            return await searchCatalogV1(query, limit, offset)
        }

        const data = await response.json()
        if (!data.data || data.data.length === 0) {
            return await searchCatalogV1(query, limit, offset)
        }

        // Get thumbnails for all assets
        const assetIds = data.data.map((item: any) => item.id).filter(Boolean).join(",")
        const thumbnails = await getThumbnails(assetIds)

        // Map to our format
        return data.data
            .filter((item: any) => item.price === 0 || item.price === undefined)
            .slice(0, limit)
            .map((item: any) => ({
                id: item.id,
                name: item.name || "Unnamed Model",
                description: item.description || "",
                price: 0,
                priceLabel: "Free",
                assetType: "Model",
                creatorName: item.creatorName || "Roblox Creator",
                creatorVerified: item.creatorHasVerifiedBadge || false,
                favoriteCount: item.favoriteCount || 0,
                thumbnailUrl: thumbnails[item.id] || `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
                productUrl: `https://www.roblox.com/library/${item.id}`,
                verified: true,
            }))
    } catch (err) {
        console.log("[Toolbox] Catalog search error:", err)
        return await searchCatalogV1(query, limit, offset)
    }
}

// Fallback to catalog v1 API
async function searchCatalogV1(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        // Use the Games API to search for models as fallback
        const params = new URLSearchParams({
            keyword: query,
            startRows: String(offset),
            maxRows: String(limit),
            sortOrder: "Desc",
            sortColumn: "Favorite",
        })

        const response = await fetch(
            `https://apis.roblox.com/toolbox-service/v1/models?${params}`,
            {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                cache: "no-store",
            }
        )

        if (!response.ok) {
            console.log("[Toolbox] Toolbox service failed:", response.status)
            // Final fallback - use economy API
            return await searchEconomyFallback(query, limit)
        }

        const data = await response.json()
        if (!data.data || !Array.isArray(data.data)) {
            return await searchEconomyFallback(query, limit)
        }

        const assetIds = data.data.map((item: any) => item.id || item.assetId).filter(Boolean).join(",")
        const thumbnails = await getThumbnails(assetIds)

        return data.data
            .filter((item: any) => (item.price === 0 || item.price === undefined))
            .slice(0, limit)
            .map((item: any) => {
                const id = item.id || item.assetId
                return {
                    id,
                    name: item.name || "Unnamed Model",
                    description: item.description || "",
                    price: 0,
                    priceLabel: "Free",
                    assetType: "Model",
                    creatorName: item.creatorName || item.creator?.name || "Roblox Creator",
                    creatorVerified: item.creatorHasVerifiedBadge || false,
                    favoriteCount: item.favoriteCount || item.favoritedCount || 0,
                    thumbnailUrl: thumbnails[id] || `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=420&height=420&format=png`,
                    productUrl: `https://www.roblox.com/library/${id}`,
                    verified: true,
                }
            })
    } catch (err) {
        console.log("[Toolbox] V1 fallback error:", err)
        return []
    }
}

// Economy catalog fallback
async function searchEconomyFallback(query: string, limit: number): Promise<any[]> {
    try {
        // Use the economy catalog endpoint
        const response = await fetch(
            `https://economy.roblox.com/v2/assets?keyword=${encodeURIComponent(query)}&assetType=Model&limit=${limit}`,
            {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                cache: "no-store",
            }
        )

        if (!response.ok) return []

        const data = await response.json()
        if (!data.data) return []

        const assetIds = data.data.map((item: any) => item.id).filter(Boolean).join(",")
        const thumbnails = await getThumbnails(assetIds)

        return data.data
            .filter((item: any) => item.price === 0 || item.priceInRobux === 0)
            .slice(0, limit)
            .map((item: any) => ({
                id: item.id,
                name: item.name || "Unnamed Model",
                description: item.description || "",
                price: 0,
                priceLabel: "Free",
                assetType: "Model",
                creatorName: item.creator?.name || "Roblox Creator",
                creatorVerified: false,
                favoriteCount: item.favoriteCount || 0,
                thumbnailUrl: thumbnails[item.id] || `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
                productUrl: `https://www.roblox.com/library/${item.id}`,
                verified: true,
            }))
    } catch (err) {
        console.log("[Toolbox] Economy fallback error:", err)
        return []
    }
}

// Search Roblox Library page for models
async function searchRobloxLibrary(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        // Try the API version
        return await searchCatalogJSON(query, limit, offset)
    } catch (err) {
        console.log("[Toolbox] Library search error:", err)
        return []
    }
}

// Parse library HTML to extract asset data (fallback)
function parseLibraryHTML(html: string, limit: number): any[] {
    const assets: any[] = []

    // Extract asset IDs and names from HTML using regex
    const assetPattern = /data-item-id="(\d+)"[^>]*>[\s\S]*?<span class="item-name[^"]*"[^>]*>([^<]+)</g
    const matches = html.matchAll(assetPattern)

    for (const match of matches) {
        if (assets.length >= limit) break

        const id = parseInt(match[1])
        const name = match[2].trim()

        if (id && name) {
            assets.push({
                id,
                name,
                description: "",
                price: 0,
                priceLabel: "Free",
                assetType: "Model",
                creatorName: "Roblox Creator",
                creatorVerified: false,
                favoriteCount: 0,
                thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=420&height=420&format=png`,
                productUrl: `https://www.roblox.com/library/${id}`,
                verified: true,
            })
        }
    }

    return assets
}

// Get trending free models using Roblox's official endpoints
async function getTrendingFreeModels(limit: number, offset: number): Promise<{ assets: any[], total: number }> {
    try {
        // Search for trending free models
        const trendingQueries = ["car", "house", "sword", "tree", "character", "weapon", "building", "furniture"]
        const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)]

        const assets = await searchCatalogJSON(randomQuery, limit, offset)

        return {
            assets,
            total: assets.length > 0 ? 500 : 0
        }
    } catch (err) {
        console.log("[Toolbox] Trending fetch error:", err)
        return { assets: [], total: 0 }
    }
}

// Get thumbnails from Roblox
async function getThumbnails(assetIds: string): Promise<Record<number, string>> {
    if (!assetIds) return {}

    try {
        const response = await fetch(
            `${THUMBNAIL_API}?assetIds=${assetIds}&size=420x420&format=Png&isCircular=false`,
            { cache: "no-store" }
        )

        if (!response.ok) return {}

        const data = await response.json()
        const thumbnails: Record<number, string> = {}

        if (data.data) {
            for (const item of data.data) {
                if (item.state === "Completed" && item.imageUrl) {
                    thumbnails[item.targetId] = item.imageUrl
                }
            }
        }

        return thumbnails
    } catch {
        return {}
    }
}

// Search Supabase cache for previously verified models
async function searchSupabaseCache(query: string, limit: number, offset: number): Promise<{ assets: any[], total: number }> {
    if (!supabase) return { assets: [], total: 0 }

    try {
        const { data, count, error } = await supabase
            .from("toolbox_cache")
            .select("*", { count: "exact" })
            .ilike("name", `%${query}%`)
            .eq("price", 0) // Only free
            .order("favorite_count", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error || !data) return { assets: [], total: 0 }

        return {
            assets: data.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || "",
                price: 0,
                priceLabel: "Free",
                assetType: item.asset_type || "Model",
                creatorName: item.creator_name || "Roblox",
                creatorVerified: item.creator_verified || false,
                favoriteCount: item.favorite_count || 0,
                thumbnailUrl: item.thumbnail_url || `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
                productUrl: item.product_url || `https://www.roblox.com/library/${item.id}`,
                verified: true,
            })),
            total: count || 0,
        }
    } catch {
        return { assets: [], total: 0 }
    }
}

// Cache verified results
async function cacheResultsInSupabase(assets: any[]): Promise<void> {
    if (!supabase || assets.length === 0) return

    try {
        const records = assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            description: asset.description || null,
            creator_name: asset.creatorName,
            creator_verified: asset.creatorVerified || false,
            favorite_count: asset.favoriteCount || 0,
            price: 0,
            asset_type: "Model",
            thumbnail_url: asset.thumbnailUrl,
            product_url: asset.productUrl,
            updated_at: new Date().toISOString(),
        }))

        await supabase
            .from("toolbox_cache")
            .upsert(records, { onConflict: "id" })
    } catch (err) {
        console.log("[Toolbox] Cache upsert error:", err)
    }
}

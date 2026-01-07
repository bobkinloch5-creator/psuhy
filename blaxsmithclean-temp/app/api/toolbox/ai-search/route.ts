import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateWithCometAPI } from "@/lib/cometapi"

// Roblox API endpoints  
const TOOLBOX_V2_SEARCH = "https://apis.roblox.com/toolbox-service/v2/assets:search"
const TOOLBOX_V1_SEARCH = "https://apis.roblox.com/toolbox-service/v1/items/search"

// Asset type IDs for Roblox
const ASSET_TYPE_MAP: Record<string, number> = {
    "all": 10,
    "model": 10,
    "audio": 3,
    "decal": 13,
    "mesh": 4,
    "animation": 24,
    "plugin": 38,
    "image": 1,
}

// AI-powered asset search with natural language understanding
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        let body
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
        }

        const { query, context } = body

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 })
        }

        console.log("[AI Toolbox] Processing query:", query)

        // Parse the query with AI or simple extraction
        let aiResult: { keywords?: string; category?: string; suggestions?: string[] } = {}

        // Try AI parsing if API key is available
        if (process.env.OPENAI_API_KEY) {
            try {
                const systemPrompt = `Extract search terms from this Roblox asset query. 
Respond ONLY in JSON: {"keywords": "simple search terms", "category": "model", "suggestions": ["alt1", "alt2"]}`

                const aiResponse = await generateWithCometAPI("grok-3", query, systemPrompt)

                // Try to parse JSON from response
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    aiResult = JSON.parse(jsonMatch[0])
                    console.log("[AI Toolbox] AI parsed:", aiResult)
                }
            } catch (aiError: any) {
                console.log("[AI Toolbox] AI parsing skipped:", aiError.message)
            }
        }

        // Fallback: Simple keyword extraction
        if (!aiResult.keywords) {
            aiResult = {
                keywords: query.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(' ')
                    .filter(w => w.length > 2)
                    .slice(0, 3)
                    .join(' ') || query,
                category: detectCategory(query),
                suggestions: generateSuggestions(query)
            }
            console.log("[AI Toolbox] Simple parse:", aiResult)
        }

        // Search Roblox with the parsed keywords
        const searchKeyword = aiResult.keywords || query
        const assetTypeId = ASSET_TYPE_MAP[aiResult.category || "model"] || 10

        let assets: any[] = []

        // Try multiple Roblox APIs
        try {
            // V1 Toolbox API
            const params = new URLSearchParams({
                keyword: searchKeyword,
                assetTypeId: assetTypeId.toString(),
                includeOnlyVerifiedCreators: "false",
                limit: "30",
                pageNumber: "1",
            })

            console.log("[AI Toolbox] Searching Roblox for:", searchKeyword)

            const response = await fetch(`${TOOLBOX_V1_SEARCH}?${params.toString()}`, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "BlaxSmith/2.0",
                },
                cache: "no-store",
            })

            if (response.ok) {
                const data = await response.json()
                assets = transformAssets(data.data || data.results || [])
                console.log("[AI Toolbox] Found", assets.length, "assets")
            } else {
                console.log("[AI Toolbox] V1 API status:", response.status)
            }
        } catch (searchError: any) {
            console.error("[AI Toolbox] Search error:", searchError.message)
        }

        // Fallback to Catalog API
        if (assets.length === 0) {
            console.log("[AI Toolbox] Trying Catalog API...")
            try {
                const catalogParams = new URLSearchParams({
                    Category: "All",
                    Keyword: searchKeyword,
                    Limit: "30",
                    SortType: "Relevance",
                })

                const catalogResponse = await fetch(
                    `https://catalog.roblox.com/v1/search/items/details?${catalogParams.toString()}`,
                    { cache: "no-store" }
                )

                if (catalogResponse.ok) {
                    const catalogData = await catalogResponse.json()
                    assets = (catalogData.data || []).map((item: any) => ({
                        id: item.id,
                        name: item.name || "Unknown",
                        description: item.description || "",
                        price: item.price || 0,
                        priceLabel: item.price === 0 ? "Free" : `R$ ${item.price}`,
                        assetType: item.assetType || 10,
                        creatorName: item.creatorName || "Roblox",
                        creatorVerified: item.creatorHasVerifiedBadge || false,
                        favoriteCount: item.favoriteCount || 0,
                        thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
                        productUrl: `https://create.roblox.com/store/asset/${item.id}`,
                    }))
                    console.log("[AI Toolbox] Catalog found", assets.length, "assets")
                }
            } catch (catalogError: any) {
                console.error("[AI Toolbox] Catalog error:", catalogError.message)
            }
        }

        // Final fallback: Use local verified assets
        if (assets.length === 0) {
            console.log("[AI Toolbox] Using local assets...")
            const { searchAssets, getAssetsForTheme } = await import("@/lib/roblox-assets")

            let localAssets = searchAssets(searchKeyword)
            if (localAssets.length === 0) {
                localAssets = getAssetsForTheme(aiResult.category || "nature").slice(0, 20)
            }

            assets = localAssets.map(asset => ({
                id: asset.id,
                name: asset.name,
                description: "",
                price: 0,
                priceLabel: "Free",
                assetType: 10,
                creatorName: "Verified",
                creatorVerified: true,
                favoriteCount: 1000,
                thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${asset.id}&width=420&height=420&format=png`,
                productUrl: `https://create.roblox.com/store/asset/${asset.id}`,
                isLocal: true,
            }))
            console.log("[AI Toolbox] Using", assets.length, "local assets")
        }

        return NextResponse.json({
            success: true,
            originalQuery: query,
            aiParsed: {
                keywords: aiResult.keywords || query,
                category: aiResult.category || "model",
            },
            suggestions: aiResult.suggestions || [],
            assets,
            totalResults: assets.length,
        })
    } catch (error: any) {
        console.error("[AI Toolbox] Unexpected error:", error)

        // Even on error, return local assets
        try {
            const { getAllAssets } = await import("@/lib/roblox-assets")
            const localAssets = getAllAssets().slice(0, 20).map(asset => ({
                id: asset.id,
                name: asset.name,
                description: "",
                price: 0,
                priceLabel: "Free",
                assetType: 10,
                creatorName: "Verified",
                creatorVerified: true,
                favoriteCount: 1000,
                thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${asset.id}&width=420&height=420&format=png`,
                productUrl: `https://create.roblox.com/store/asset/${asset.id}`,
            }))

            return NextResponse.json({
                success: true,
                assets: localAssets,
                totalResults: localAssets.length,
                source: "fallback",
            })
        } catch {
            return NextResponse.json({
                success: false,
                error: "Search failed",
                assets: [],
            }, { status: 500 })
        }
    }
}

// Detect category from query
function detectCategory(query: string): string {
    const lowerQuery = query.toLowerCase()

    const categoryKeywords: Record<string, string[]> = {
        audio: ["sound", "music", "audio", "sfx", "song"],
        animation: ["animation", "anim", "dance", "emote", "walk", "run"],
        decal: ["decal", "image", "picture", "texture", "logo"],
        mesh: ["mesh", "3d", "geometry"],
        plugin: ["plugin", "tool", "script"],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => lowerQuery.includes(kw))) {
            return category
        }
    }

    return "model"
}

// Generate search suggestions
function generateSuggestions(query: string): string[] {
    const words = query.toLowerCase().split(' ').filter(w => w.length > 2)
    const suggestions: string[] = []

    // Add individual words as suggestions
    for (const word of words.slice(0, 2)) {
        suggestions.push(word)
    }

    // Add common variations
    const variations: Record<string, string[]> = {
        car: ["vehicle", "automobile"],
        house: ["building", "home"],
        tree: ["plant", "nature"],
        sword: ["weapon", "blade"],
        gun: ["weapon", "firearm"],
    }

    for (const word of words) {
        if (variations[word]) {
            suggestions.push(...variations[word].slice(0, 1))
        }
    }

    return [...new Set(suggestions)].slice(0, 3)
}

// Transform Roblox API response
function transformAssets(items: any[]) {
    return items.map((item: any) => {
        const asset = item.asset || item
        const creator = item.creator || {}

        return {
            id: asset.id || item.id,
            name: asset.name || item.name || "Unknown",
            description: asset.description || item.description || "",
            price: asset.price || 0,
            priceLabel: asset.price === 0 ? "Free" : `R$ ${asset.price}`,
            assetType: asset.typeId || asset.assetType || 10,
            creatorName: creator.name || item.creatorName || "Roblox",
            creatorVerified: creator.hasVerifiedBadge || false,
            favoriteCount: item.favoriteCount || asset.favoriteCount || 0,
            thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${asset.id || item.id}&width=420&height=420&format=png`,
            productUrl: `https://create.roblox.com/store/asset/${asset.id || item.id}`,
        }
    })
}

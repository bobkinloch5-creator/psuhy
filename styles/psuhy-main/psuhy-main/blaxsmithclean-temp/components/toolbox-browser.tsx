"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Loader2, Star, Download, ExternalLink, Sparkles, Filter, Grid3X3, List, Send, Check } from "lucide-react"

interface Asset {
    id: number
    name: string
    description: string
    price: number
    priceLabel: string
    assetType: string
    creatorName: string
    creatorVerified: boolean
    favoriteCount: number
    thumbnailUrl: string
    productUrl: string
}

interface ToolboxProps {
    onAssetSelect?: (asset: Asset) => void
}

const CATEGORIES = [
    { value: "all", label: "All" },
    { value: "model", label: "Models" },
    { value: "audio", label: "Audio" },
    { value: "decal", label: "Decals" },
    { value: "mesh", label: "Meshes" },
    { value: "animation", label: "Animations" },
    { value: "plugin", label: "Plugins" },
]

export default function ToolboxBrowser({ onAssetSelect }: ToolboxProps) {
    const [query, setQuery] = useState("")
    const [category, setCategory] = useState("all")
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [aiMode, setAiMode] = useState(true)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [aiParsed, setAiParsed] = useState<{ keywords?: string, category?: string } | null>(null)

    // Debounced search
    const searchAssets = useCallback(async (searchQuery: string, searchCategory: string, useAi: boolean) => {
        if (!searchQuery.trim()) {
            setAssets([])
            return
        }

        setLoading(true)
        try {
            let response

            if (useAi) {
                // AI-powered search
                response = await fetch("/api/toolbox/ai-search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: searchQuery }),
                })
            } else {
                // Direct search
                const params = new URLSearchParams({
                    query: searchQuery,
                    category: searchCategory,
                    limit: "24",
                })
                response = await fetch(`/api/toolbox/search?${params}`)
            }

            const data = await response.json()

            if (data.success) {
                setAssets(data.assets || [])
                setSuggestions(data.suggestions || [])
                setAiParsed(data.aiParsed || null)
            } else {
                console.error("Search failed:", data.error)
                setAssets([])
            }
        } catch (error) {
            console.error("Search error:", error)
            setAssets([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Search on enter or button click
    const handleSearch = () => {
        searchAssets(query, category, aiMode)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">AI Toolbox</h2>
                    <p className="text-sm text-white/60">Search Roblox assets with AI</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={aiMode ? "Describe what you need... (e.g., 'medieval castle furniture')" : "Search assets..."}
                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !query.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : aiMode ? (
                            <Sparkles className="w-5 h-5" />
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                        Search
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* AI Mode Toggle */}
                        <button
                            onClick={() => setAiMode(!aiMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${aiMode
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                : "bg-white/5 text-white/60 border border-white/10"
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Mode
                        </button>

                        {/* Category Filter (only in non-AI mode) */}
                        {!aiMode && (
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-sm text-white"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* View Mode */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white/10" : ""}`}
                        >
                            <Grid3X3 className="w-4 h-4 text-white/60" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded ${viewMode === "list" ? "bg-white/10" : ""}`}
                        >
                            <List className="w-4 h-4 text-white/60" />
                        </button>
                    </div>
                </div>

                {/* AI Parsed Info */}
                {aiParsed && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>AI searched: <span className="text-white">{aiParsed.keywords}</span></span>
                        {aiParsed.category && aiParsed.category !== "all" && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {aiParsed.category}
                            </span>
                        )}
                    </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white/40">Try:</span>
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setQuery(suggestion)
                                    searchAssets(suggestion, category, aiMode)
                                }}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white/70 transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="mt-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                ) : assets.length > 0 ? (
                    <div className={viewMode === "grid"
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        : "space-y-2"
                    }>
                        {assets.map((asset) => (
                            <AssetCard
                                key={asset.id}
                                asset={asset}
                                viewMode={viewMode}
                                onSelect={() => onAssetSelect?.(asset)}
                            />
                        ))}
                    </div>
                ) : query && !loading ? (
                    <div className="text-center py-12 text-white/40">
                        No assets found. Try a different search term.
                    </div>
                ) : (
                    <div className="text-center py-12 text-white/40">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Search for Roblox assets using natural language</p>
                        <p className="text-sm mt-1">Example: "spooky Halloween decorations"</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function AssetCard({ asset, viewMode, onSelect }: { asset: Asset; viewMode: "grid" | "list"; onSelect: () => void }) {
    const [imgError, setImgError] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const sendToStudio = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (sending || sent) return

        setSending(true)
        try {
            const response = await fetch("/api/toolbox/insert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: asset.id,
                    assetType: asset.assetType,
                    assetName: asset.name,
                }),
            })

            if (response.ok) {
                setSent(true)
                setTimeout(() => setSent(false), 3000)
            }
        } catch (error) {
            console.error("Failed to send to studio:", error)
        } finally {
            setSending(false)
        }
    }

    if (viewMode === "list") {
        return (
            <div
                onClick={onSelect}
                className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors"
            >
                <div className="w-12 h-12 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                    {!imgError ? (
                        <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Grid3X3 className="w-6 h-6" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{asset.name}</h3>
                    <p className="text-sm text-white/40 truncate">by {asset.creatorName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-yellow-400 flex items-center gap-1">
                        <Star className="w-4 h-4" /> {asset.favoriteCount}
                    </span>
                    <span className={`text-sm font-medium ${asset.price === 0 ? "text-green-400" : "text-white"}`}>
                        {asset.priceLabel}
                    </span>
                    <button
                        onClick={sendToStudio}
                        disabled={sending}
                        className={`p-2 rounded transition-colors ${sent
                            ? "bg-green-500/20 text-green-400"
                            : "bg-orange-500/20 hover:bg-orange-500/30 text-orange-400"
                            }`}
                        title="Send to Roblox Studio"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sent ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                    <a
                        href={asset.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-white/10 rounded"
                    >
                        <ExternalLink className="w-4 h-4 text-white/40" />
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={onSelect}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group"
        >
            <div className="aspect-square bg-white/10 relative">
                {!imgError ? (
                    <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Grid3X3 className="w-12 h-12" />
                    </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={sendToStudio}
                        disabled={sending}
                        className={`p-2 rounded-lg transition-colors ${sent
                            ? "bg-green-500/80 text-white"
                            : "bg-orange-500/80 hover:bg-orange-500 text-white"
                            }`}
                        title="Send to Roblox Studio"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sent ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                    <a
                        href={asset.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-black/50 rounded-lg"
                    >
                        <ExternalLink className="w-4 h-4 text-white" />
                    </a>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-medium text-white text-sm truncate">{asset.name}</h3>
                <p className="text-xs text-white/40 truncate mt-0.5">by {asset.creatorName}</p>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <Star className="w-3 h-3" /> {asset.favoriteCount.toLocaleString()}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${asset.price === 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-white"
                        }`}>
                        {asset.priceLabel}
                    </span>
                </div>
            </div>
        </div>
    )
}

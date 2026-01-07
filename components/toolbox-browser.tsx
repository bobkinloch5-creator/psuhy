"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Star, ExternalLink, Grid3X3, Send, Check, Package, Plus } from "lucide-react"

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

export default function ToolboxBrowser() {
    const [query, setQuery] = useState("")
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const searchAssets = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setAssets([])
            return
        }

        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                query: searchQuery,
                limit: "48",
            })
            const response = await fetch(`/api/toolbox/search?${params}`)
            const data = await response.json()

            if (data.success) {
                setAssets(data.assets || [])
            } else {
                console.error("Search failed:", data.error)
                setError(data.error || "Search failed")
                setAssets([])
            }
        } catch (err) {
            console.error("Search error:", err)
            setError("Failed to search toolbox")
            setAssets([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        searchAssets(query)
    }

    return (
        <div className="glassmorphism rounded-2xl p-6 border-orange-500/20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                    <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Roblox Toolbox</h2>
                    <p className="text-xs text-white/50">Search free models and insert into Studio</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Search models... (e.g., sword, car, tree)"
                        className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500/50 text-sm"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                </button>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-400 mb-2" />
                    <p className="text-white/50 text-sm">Searching Roblox Toolbox...</p>
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-400">
                    <p className="text-sm">{error}</p>
                </div>
            ) : assets.length > 0 ? (
                <>
                    <p className="text-xs text-white/40 mb-3">{assets.length} results</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {assets.map((asset) => (
                            <AssetCard key={asset.id} asset={asset} />
                        ))}
                    </div>
                </>
            ) : query ? (
                <div className="text-center py-12 text-white/40">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No models found</p>
                </div>
            ) : (
                <div className="text-center py-12 text-white/40">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Search for Roblox models to insert into Studio</p>
                </div>
            )}
        </div>
    )
}

function AssetCard({ asset }: { asset: Asset }) {
    const [imgError, setImgError] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const insertToStudio = async () => {
        if (sending || sent) return

        setSending(true)
        try {
            const response = await fetch("/api/toolbox/insert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: asset.id,
                    assetType: asset.assetType || "Model",
                    assetName: asset.name,
                }),
            })

            const data = await response.json()
            if (data.success) {
                setSent(true)
                setTimeout(() => setSent(false), 2000)
            }
        } catch (error) {
            console.error("Failed to insert:", error)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="group relative bg-black/40 rounded-lg overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all">
            {/* Thumbnail */}
            <div className="aspect-square bg-black/60 relative">
                {!imgError ? (
                    <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Package className="w-8 h-8" />
                    </div>
                )}

                {/* Insert Button Overlay */}
                <button
                    onClick={insertToStudio}
                    disabled={sending}
                    className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${sent ? "bg-green-500/80" : "bg-orange-500/80"
                        }`}
                >
                    {sending ? (
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : sent ? (
                        <Check className="w-6 h-6 text-white" />
                    ) : (
                        <Plus className="w-6 h-6 text-white" />
                    )}
                </button>

                {/* Free badge */}
                {asset.price === 0 && (
                    <div className="absolute top-1 left-1">
                        <span className="px-1.5 py-0.5 bg-green-500/90 text-white text-[9px] font-bold rounded">
                            FREE
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-2">
                <h3 className="text-xs font-medium text-white truncate">{asset.name}</h3>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/40 truncate max-w-[60%]">{asset.creatorName}</span>
                    <span className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />
                        {asset.favoriteCount >= 1000 ? `${(asset.favoriteCount / 1000).toFixed(0)}k` : asset.favoriteCount}
                    </span>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Loader2, Download, Eye, Check, AlertCircle, Box, Palette, Wand2, RotateCcw, Maximize2, ZoomIn, RotateCw, ChevronDown } from "lucide-react"

// Declare model-viewer as a valid JSX element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
                src?: string
                alt?: string
                'camera-controls'?: boolean
                'auto-rotate'?: boolean
                'shadow-intensity'?: string
                exposure?: string
                'environment-image'?: string
                poster?: string
            }, HTMLElement>
        }
    }
}

interface BlaxSmith3DGeneratorProps {
    modelCredits: number
    onCreditsUpdate?: (newCredits: number) => void
}

const STYLE_OPTIONS = [
    { id: "none", name: "No Style", icon: "🚫", image: null },
    { id: "roblox", name: "Roblox", icon: "🎮", image: "/images/styles/roblox.png" },
    { id: "realistic", name: "Realistic", icon: "🎯", image: "/images/styles/realistic.png" },
    { id: "cartoon", name: "Cartoon", icon: "🎪", image: "/images/styles/cartoon.png" },
    { id: "anime", name: "Detailed Anime", icon: "✨", image: "/images/styles/anime.png" },
    { id: "stylized_anime", name: "Stylized Anime", icon: "🌸", image: "/images/styles/stylized.png" },
    { id: "lowpoly", name: "Low Poly", icon: "💎", image: "/images/styles/lowpoly.png" },
    { id: "clay", name: "Clay Morphic", icon: "🧱", image: "/styles/clay-morphic.png" },
    { id: "cozy", name: "Cozy Mobile", icon: "🏠", image: "/styles/cozy-mobile.png" },
    { id: "isometric", name: "Isometric", icon: "🏰", image: "/styles/isometric.png" },
    { id: "retro", name: "Retro/90s", icon: "📺", image: "/styles/retro-90s.png" },
    { id: "hand_painted", name: "Hand-Painted", icon: "🎨", image: "/styles/hand-painted.png" },
]

const QUALITY_OPTIONS = [
    { id: "high", name: "High Quality", description: "Best quality, longer generation" },
    { id: "low_poly", name: "Low Poly", description: "Optimized for games" },
    { id: "3d_print", name: "3D Print", description: "Watertight mesh for printing" },
]

const TEXTURE_OPTIONS = [
    { id: "none", name: "None", resolution: null },
    { id: "512", name: "512 × 512", resolution: 512 },
    { id: "1k", name: "1k × 1k", resolution: 1024 },
    { id: "2k", name: "2k × 2k", resolution: 2048 },
]

const TOPOLOGY_OPTIONS = [
    { id: "auto", name: "Auto" },
    { id: "triangles", name: "Triangles" },
    { id: "quads", name: "Quads" },
]


// Load model-viewer script dynamically
const loadModelViewer = () => {
    if (typeof window !== 'undefined' && !document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement('script')
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js'
        script.type = 'module'
        document.head.appendChild(script)
    }
}

// Model Viewer Component using ref-based approach with robust DOM handling
function ModelViewerComponent({ src, alt }: { src: string; alt: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<HTMLElement | null>(null)
    const mountedRef = useRef(true)
    const [isLoading, setIsLoading] = useState(true)
    const [viewerKey] = useState(() => `viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

    useEffect(() => {
        mountedRef.current = true
        loadModelViewer()
        let timeoutId: NodeJS.Timeout | null = null

        // Wait for script to load then create the element
        const checkAndCreate = () => {
            if (!mountedRef.current) return

            if (containerRef.current && customElements.get('model-viewer')) {
                // Create new viewer element
                const viewer = document.createElement('model-viewer')
                viewer.setAttribute('src', src)
                viewer.setAttribute('alt', alt)
                viewer.setAttribute('camera-controls', '')
                viewer.setAttribute('auto-rotate', '')
                viewer.setAttribute('shadow-intensity', '1')
                viewer.setAttribute('exposure', '1')
                viewer.setAttribute('environment-image', 'neutral')
                viewer.setAttribute('data-viewer-key', viewerKey)
                viewer.style.width = '100%'
                viewer.style.height = '100%'
                viewer.style.backgroundColor = 'transparent'

                viewer.addEventListener('load', () => {
                    if (mountedRef.current) setIsLoading(false)
                })

                viewer.addEventListener('error', () => {
                    if (mountedRef.current) setIsLoading(false)
                })

                // Clear existing content safely - use innerHTML to avoid React reconciliation issues
                if (containerRef.current) {
                    try {
                        // Disconnect any existing viewers first
                        const existingViewers = containerRef.current.querySelectorAll('model-viewer')
                        existingViewers.forEach(v => {
                            try { v.remove() } catch { /* ignore */ }
                        })
                    } catch { /* ignore */ }

                    containerRef.current.appendChild(viewer)
                    viewerRef.current = viewer
                }
            } else if (mountedRef.current) {
                // Retry after a short delay
                timeoutId = setTimeout(checkAndCreate, 100)
            }
        }

        checkAndCreate()

        return () => {
            mountedRef.current = false
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            // Clean up by removing our specific viewer only
            try {
                if (viewerRef.current) {
                    viewerRef.current.remove() // Use remove() instead of removeChild for safety
                    viewerRef.current = null
                }
            } catch {
                // Ignore removal errors - element may already be removed
            }
        }
    }, [src, alt, viewerKey])

    // Use a wrapper to prevent React from managing the model-viewer's DOM
    return (
        <div className="w-full h-full relative">
            <div ref={containerRef} className="w-full h-full" style={{ isolation: 'isolate' }} />
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        <span className="text-white/70 text-sm">Loading 3D Model...</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export function BlaxSmith3DGenerator({ modelCredits, onCreditsUpdate }: BlaxSmith3DGeneratorProps) {
    const [prompt, setPrompt] = useState("")
    const [selectedStyle, setSelectedStyle] = useState("roblox")
    const [selectedQuality, setSelectedQuality] = useState("high")
    const [selectedTexture, setSelectedTexture] = useState("2k")
    const [selectedTopology, setSelectedTopology] = useState("auto")
    const [showStyleModal, setShowStyleModal] = useState(false)
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedModel, setGeneratedModel] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [localCredits, setLocalCredits] = useState(modelCredits)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressText, setProgressText] = useState("")
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [remainingTime, setRemainingTime] = useState(25)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Load model-viewer on mount
    useEffect(() => {
        loadModelViewer()
    }, [])

    // Handle downloading with proper filename
    const handleDownload = async (url: string, format: string) => {
        try {
            // Create a filename from the prompt
            const sanitizedPrompt = prompt.trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .slice(0, 50) || 'model'

            const filename = `${sanitizedPrompt}.${format}`

            // Fetch the file
            const response = await fetch(url)
            const blob = await response.blob()

            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)

            setShowExportDropdown(false)
        } catch (error) {
            console.error('[Download] Error:', error)
            // Fallback to direct link
            window.open(url, '_blank')
        }
    }

    const generateModel = async () => {
        if (!prompt.trim() || localCredits <= 0) return

        setIsGenerating(true)
        setGeneratedModel(null)
        setError(null)
        setProgress(0)
        setProgressText("Initializing...")
        setElapsedTime(0)
        setRemainingTime(90)

        // Start progress simulation (LGM typically takes 60-120 seconds)
        const startTime = Date.now()
        const estimatedDuration = 15000 // 15 seconds estimate for LGM

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime
            const elapsedSeconds = Math.floor(elapsed / 1000)
            const remainingSeconds = Math.max(0, 90 - elapsedSeconds)
            const progressPercent = Math.min(95, (elapsed / estimatedDuration) * 100)

            setProgress(progressPercent)
            setElapsedTime(elapsedSeconds)
            setRemainingTime(remainingSeconds)

            if (progressPercent < 20) {
                setProgressText("🔍 Analyzing prompt...")
            } else if (progressPercent < 40) {
                setProgressText("🎨 Generating mesh...")
            } else if (progressPercent < 60) {
                setProgressText("🖼️ Adding textures...")
            } else if (progressPercent < 80) {
                setProgressText("⚡ Optimizing model...")
            } else {
                setProgressText("✨ Finalizing...")
            }
        }, 200)

        try {
            const res = await fetch("/api/generate/model", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Important: include cookies for auth
                body: JSON.stringify({ prompt, style: selectedStyle }),
            })
            const data = await res.json()
            console.log("[3D Generator] API Response:", data)

            // Handle auth errors specifically
            if (res.status === 401) {
                setError("Session expired. Please refresh the page or click your profile to sign in again.")
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current)
                    progressIntervalRef.current = null
                }
                setIsGenerating(false)
                // Try to refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload()
                }, 3000)
                return
            }

            // Clear progress interval
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
            }
            setProgress(100)
            setProgressText("Complete!")

            if (data.success) {
                const newCredits = typeof data.creditsRemaining === "number"
                    ? data.creditsRemaining
                    : localCredits - 1
                setLocalCredits(newCredits)
                onCreditsUpdate?.(newCredits)

                // Extract model data from various possible response structures
                const modelData = data.model || data.creation?.asset_data || data.creation || {}
                const formats = modelData.formats || modelData.asset_data?.formats || {}

                // Deep search for GLB URL in nested response
                const findGlbUrl = (obj: any, depth = 0): string | null => {
                    if (depth > 6) return null;
                    if (typeof obj === 'string' && (obj.includes('.glb') || obj.includes('storage.googleapis.com'))) return obj;
                    if (typeof obj === 'object' && obj !== null) {
                        for (const key of Object.keys(obj)) {
                            const found = findGlbUrl(obj[key], depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                // Try all possible paths for the model URL
                const modelUrl = modelData.model_url || modelData.glb_url || modelData.glbUrl ||
                    modelData.downloadUrl || modelData.download_url ||
                    modelData.files?.glb || formats.glb ||
                    modelData.asset_data?.model_url || modelData.url ||
                    findGlbUrl(data);

                const previewUrl = modelData.preview_url || modelData.previewUrl ||
                    modelData.thumbnail || modelData.image ||
                    modelData.asset_data?.preview_url || null;

                console.log("[3D Generator] Found model URL:", modelUrl);
                console.log("[3D Generator] Full API response structure:", JSON.stringify(data, null, 2));

                const extractedModel = {
                    name: modelData.name || modelData.prompt || prompt,
                    model_url: modelUrl,
                    preview_url: previewUrl,
                    formats: {
                        glb: formats.glb || modelUrl || null,
                        fbx: formats.fbx || modelData.fbx_url || null,
                        obj: formats.obj || modelData.obj_url || null,
                        usdz: formats.usdz || modelData.usdz_url || null,
                    },
                    asset_data: modelData.asset_data || modelData,
                }
                console.log("[3D Generator] Extracted model:", extractedModel)
                setGeneratedModel(extractedModel)
            } else {
                setError(data.error || "Model generation failed")
            }
        } catch (err) {
            console.error("[3D Generator] Error:", err)
            setError("Generation failed. Please try again.")
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
            }
        } finally {
            setIsGenerating(false)
            setTimeout(() => {
                setProgress(0)
                setProgressText("")
            }, 1000)
        }
    }

    return (
        <div className="space-y-4">
            {/* Premium Sloyd-style Header */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-cyan-500/10 border border-white/10 overflow-hidden group">
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-cyan-500/5 animate-pulse" />
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-700" />
                <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-700" />

                <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-xl shadow-purple-500/40 group-hover:shadow-purple-500/60 transition-all group-hover:scale-105 duration-300">
                        <Wand2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-lg tracking-tight">Text-to-3D Generator</h4>
                        <p className="text-white/50 text-sm flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs font-medium">
                                <Sparkles className="w-3 h-3" />
                                6 AI Engines
                            </span>
                            <span className="text-white/30">•</span>
                            <span>Multi-format export</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Style Selection - Compact Button */}
            <div className="space-y-3">
                <div className="flex items-center gap-4">
                    {/* Quality Selector */}
                    <div className="flex-1">
                        <label className="text-white/60 text-xs mb-1.5 block">Quality:</label>
                        <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                            {QUALITY_OPTIONS.map((q) => (
                                <button
                                    key={q.id}
                                    onClick={() => setSelectedQuality(q.id)}
                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedQuality === q.id
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                                        : "text-white/60 hover:text-white"
                                        }`}
                                >
                                    {q.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Style Selector Button */}
                    <div>
                        <label className="text-white/60 text-xs mb-1.5 block">Style:</label>
                        <button
                            onClick={() => setShowStyleModal(true)}
                            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                        >
                            {STYLE_OPTIONS.find(s => s.id === selectedStyle)?.icon || "🎨"}
                            {STYLE_OPTIONS.find(s => s.id === selectedStyle)?.name || "Select Style"}
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Advanced Options Toggle */}
                <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="text-white/50 text-xs hover:text-white/80 transition-colors flex items-center gap-1"
                >
                    <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedOptions ? "rotate-180" : ""}`} />
                    {showAdvancedOptions ? "Less" : "More"} options
                </button>

                {/* Advanced Options Panel */}
                {showAdvancedOptions && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                        {/* Topology */}
                        <div>
                            <label className="text-white/60 text-xs mb-1.5 block">Topology:</label>
                            <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                                {TOPOLOGY_OPTIONS.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTopology(t.id)}
                                        className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${selectedTopology === t.id
                                            ? "bg-purple-500/80 text-white"
                                            : "text-white/60 hover:text-white"
                                            }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Max Faces - Just display */}
                        <div>
                            <label className="text-white/60 text-xs mb-1.5 block">Max Faces:</label>
                            <div className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm">
                                40000
                            </div>
                        </div>

                        {/* Texture Resolution */}
                        <div>
                            <label className="text-white/60 text-xs mb-1.5 block">Texture:</label>
                            <select
                                value={selectedTexture}
                                onChange={(e) => setSelectedTexture(e.target.value)}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
                            >
                                {TEXTURE_OPTIONS.map((t) => (
                                    <option key={t.id} value={t.id} className="bg-zinc-900">
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Prompt Input */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                </div>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your 3D model idea..."
                    className="relative w-full pl-14 pr-32 py-5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-base shadow-inner shadow-black/20"
                    disabled={isGenerating}
                    onKeyDown={(e) => e.key === "Enter" && !isGenerating && prompt.trim() && localCredits > 0 && generateModel()}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-purple-300 bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-lg font-medium">
                    1 credit
                </span>
            </div>

            {/* Premium Generate Button */}
            <button
                onClick={generateModel}
                disabled={isGenerating || localCredits <= 0 || !prompt.trim()}
                className="group relative w-full px-6 py-5 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
            >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                {isGenerating ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Creating Your Model...</span>
                    </>
                ) : (
                    <>
                        <div className="p-1.5 rounded-lg bg-white/20">
                            <Wand2 className="w-5 h-5" />
                        </div>
                        <span>Generate 3D Model</span>
                        <Sparkles className="w-5 h-5 text-yellow-200" />
                    </>
                )}
            </button>

            {/* Progress Bar with Countdown Timer */}
            {isGenerating && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-orange-900/30 border border-purple-500/40">
                    {/* Countdown Timer - Large Display */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                                {remainingTime > 0 ? remainingTime : "..."}<span className="text-2xl">s</span>
                            </div>
                            <div className="text-xs text-white/50 mt-1">Remaining</div>
                        </div>
                        <div className="w-px h-12 bg-white/20"></div>
                        <div className="text-center">
                            <div className="text-2xl font-semibold text-white/80">
                                {elapsedTime}<span className="text-lg">s</span>
                            </div>
                            <div className="text-xs text-white/50 mt-1">Elapsed</div>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        <span className="text-white/90 text-sm font-medium">{progressText}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 bg-black/40 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-300 relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                    </div>

                    {/* Progress Percentage */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Multi-Engine AI</span>
                        <span className="text-sm font-bold text-white/80">{Math.round(progress)}%</span>
                    </div>
                </div>
            )}

            {/* No Credits Warning */}
            {localCredits <= 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 font-semibold text-sm">Out of Model Credits</p>
                        <p className="text-amber-300/80 text-xs mt-1">Upgrade your plan to get more model generation credits</p>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-400 font-semibold text-sm">Generation Failed</p>
                        <p className="text-red-300/80 text-xs mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Generated Model Display with 3D Viewer */}
            {generatedModel && (
                <div className={`mt-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10 border border-purple-500/30 animate-[slide-up_0.3s_ease-out] ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
                    {/* Preview Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400" />
                            <h4 className="text-white font-bold">Model Generated!</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setGeneratedModel(null)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                title="Clear"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Interactive 3D Model Viewer */}
                    {generatedModel.model_url && (
                        <div className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${isFullscreen ? 'h-[calc(100%-180px)]' : 'h-80'}`}>
                            <ModelViewerComponent
                                src={generatedModel.model_url}
                                alt={`3D Model: ${prompt}`}
                            />

                            {/* 3D Viewer Controls Overlay */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-white/50 bg-black/60 px-3 py-1.5 rounded-lg">
                                <RotateCw className="w-3 h-3" />
                                <span>Drag to rotate</span>
                                <span className="mx-1">•</span>
                                <ZoomIn className="w-3 h-3" />
                                <span>Scroll to zoom</span>
                            </div>

                            {/* Style Badge */}
                            <div className="absolute bottom-3 right-3 text-xs text-white/70 bg-purple-500/30 border border-purple-500/50 px-2 py-1 rounded-lg">
                                {selectedStyle} style
                            </div>
                        </div>
                    )}

                    {/* Fallback to preview image if no GLB URL */}
                    {!generatedModel.model_url && generatedModel.preview_url && (
                        <div className="relative bg-black/40">
                            <img
                                src={generatedModel.preview_url}
                                alt="3D Model Preview"
                                className={`w-full object-contain ${isFullscreen ? 'h-[calc(100%-180px)]' : 'h-64'}`}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-white/50 bg-black/60 px-2 py-1 rounded">
                                {selectedStyle} style
                            </div>
                        </div>
                    )}

                    {/* No model URL fallback message */}
                    {!generatedModel.model_url && !generatedModel.preview_url && (
                        <div className="p-8 text-center bg-black/20">
                            <Box className="w-12 h-12 text-white/30 mx-auto mb-3" />
                            <p className="text-white/50 text-sm">Model generated but preview not available</p>
                            <p className="text-white/30 text-xs mt-1">Check browser console for details</p>
                        </div>
                    )}

                    {/* Model Info */}
                    <div className="p-4 space-y-4">
                        <p className="text-white/80 text-sm bg-black/20 p-2 rounded-lg">
                            <span className="text-purple-400 font-medium">Prompt:</span> {generatedModel.name || prompt}
                        </p>

                        {/* Export Buttons - Sloyd style */}
                        <div className="flex gap-3">
                            {generatedModel.model_url && (
                                <>
                                    {/* Export Dropdown */}
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export GLB
                                            <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown Menu - positioned above with high z-index */}
                                        {showExportDropdown && (
                                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-xl z-[100]">
                                                <button
                                                    onClick={() => handleDownload(generatedModel.model_url, 'glb')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                                                >
                                                    <Download className="w-4 h-4 text-green-400" />
                                                    <div>
                                                        <p className="text-white text-sm font-medium">GLB Format</p>
                                                        <p className="text-white/50 text-xs">Best for Roblox Studio</p>
                                                    </div>
                                                </button>
                                                {generatedModel.formats?.fbx && (
                                                    <button
                                                        onClick={() => handleDownload(generatedModel.formats.fbx, 'fbx')}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                                                    >
                                                        <Download className="w-4 h-4 text-blue-400" />
                                                        <div>
                                                            <p className="text-white text-sm font-medium">FBX Format</p>
                                                            <p className="text-white/50 text-xs">For Unity, Unreal, Blender, Roblox</p>
                                                        </div>
                                                    </button>
                                                )}
                                                {generatedModel.formats?.obj && (
                                                    <button
                                                        onClick={() => handleDownload(generatedModel.formats.obj, 'obj')}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <Download className="w-4 h-4 text-orange-400" />
                                                        <div>
                                                            <p className="text-white text-sm font-medium">OBJ Format</p>
                                                            <p className="text-white/50 text-xs">Universal 3D format</p>
                                                        </div>
                                                    </button>
                                                )}
                                                {!generatedModel.formats?.fbx && !generatedModel.formats?.obj && (
                                                    <div className="px-4 py-3 text-white/40 text-xs text-center">
                                                        Only GLB format available
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <a
                                        href={generatedModel.model_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Backdrop */}
            {isFullscreen && generatedModel && (
                <div
                    className="fixed inset-0 bg-black/80 z-40"
                    onClick={() => setIsFullscreen(false)}
                />
            )}

            {/* Import Instructions */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border border-white/5">
                <p className="text-xs text-white/50">
                    💡 <span className="font-semibold text-white/70">To import into Roblox:</span> Download the GLB file → In Roblox Studio: Home → Import 3D → Select your file
                </p>
            </div>

            {/* Style Selection Modal - Premium Design */}
            {showStyleModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]"
                    onClick={() => setShowStyleModal(false)}
                >
                    <div
                        className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-purple-900/30 border border-white/10 rounded-3xl p-8 w-full max-w-3xl max-h-[85vh] overflow-auto shadow-2xl shadow-purple-500/10 animate-[slideUp_0.3s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Premium Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">Choose a Style</h3>
                                <p className="text-white/40 text-sm mt-1">Select an art style for your 3D model</p>
                            </div>
                            <button
                                onClick={() => setShowStyleModal(false)}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all hover:rotate-90 duration-300"
                            >
                                ×
                            </button>
                        </div>

                        {/* Premium Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            {STYLE_OPTIONS.map((style, index) => (
                                <button
                                    key={style.id}
                                    onClick={() => {
                                        setSelectedStyle(style.id)
                                        setShowStyleModal(false)
                                    }}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 aspect-square hover:scale-[1.02] hover:-translate-y-1 animate-[fadeIn_0.3s_ease-out_backwards] ${selectedStyle === style.id
                                        ? "border-cyan-400 shadow-xl shadow-cyan-500/40 ring-2 ring-cyan-400/30"
                                        : "border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
                                        }`}
                                >
                                    {style.image ? (
                                        <>
                                            <img
                                                src={style.image}
                                                alt={style.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                            <span className="text-5xl opacity-50 group-hover:scale-110 transition-transform">🚫</span>
                                        </div>
                                    )}

                                    {/* Style Label with Icon */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{style.icon}</span>
                                            <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{style.name}</span>
                                        </div>
                                    </div>

                                    {/* Selected Indicator */}
                                    {selectedStyle === style.id && (
                                        <div className="absolute top-3 right-3 w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-[popIn_0.2s_ease-out]">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}

                                    {/* Hover Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-cyan-500/0 group-hover:from-purple-500/10 group-hover:to-cyan-500/10 transition-all duration-300" />
                                </button>
                            ))}
                        </div>

                        {/* Premium Done Button */}
                        <button
                            onClick={() => setShowStyleModal(false)}
                            className="mt-8 w-full px-6 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group"
                        >
                            <span className="relative z-10">Done</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}


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
    { id: "realistic", name: "Realistic", icon: "🎯", image: "https://tr.rbxcdn.com/180DAY-4c7d8e2f3a5b6c9d0e1f2a3b4c5d6e7f/150/150/Model/Webp/noFilter" },
    { id: "stylized", name: "Stylized", icon: "🎨", image: "https://tr.rbxcdn.com/180DAY-8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d/150/150/Model/Webp/noFilter" },
    { id: "lowpoly", name: "Low Poly", icon: "💎", image: "https://tr.rbxcdn.com/180DAY-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d/150/150/Model/Webp/noFilter" },
    { id: "cartoon", name: "Cartoon", icon: "🎪", image: "https://tr.rbxcdn.com/180DAY-5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b/150/150/Model/Webp/noFilter" },
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

// Model Viewer Component using ref-based approach
function ModelViewerComponent({ src, alt }: { src: string; alt: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadModelViewer()

        // Wait for script to load then create the element
        const checkAndCreate = () => {
            if (containerRef.current && customElements.get('model-viewer')) {
                const viewer = document.createElement('model-viewer')
                viewer.setAttribute('src', src)
                viewer.setAttribute('alt', alt)
                viewer.setAttribute('camera-controls', '')
                viewer.setAttribute('auto-rotate', '')
                viewer.setAttribute('shadow-intensity', '1')
                viewer.setAttribute('exposure', '1')
                viewer.setAttribute('environment-image', 'neutral')
                viewer.style.width = '100%'
                viewer.style.height = '100%'
                viewer.style.backgroundColor = 'transparent'

                viewer.addEventListener('load', () => setIsLoading(false))

                containerRef.current.innerHTML = ''
                containerRef.current.appendChild(viewer)
            } else {
                // Retry after a short delay
                setTimeout(checkAndCreate, 100)
            }
        }

        checkAndCreate()

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = ''
            }
        }
    }, [src, alt])

    return (
        <div ref={containerRef} className="w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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
    const [selectedStyle, setSelectedStyle] = useState("realistic")
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

    const generateModel = async () => {
        if (!prompt.trim() || localCredits <= 0) return

        setIsGenerating(true)
        setGeneratedModel(null)
        setError(null)
        setProgress(0)
        setProgressText("Initializing...")
        setElapsedTime(0)
        setRemainingTime(90)

        // Start progress simulation (Cube3D typically takes 60-120 seconds)
        const startTime = Date.now()
        const estimatedDuration = 90000 // 90 seconds estimate for Cube3D

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
                setError("Please sign in to generate models. Your session may have expired.")
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current)
                    progressIntervalRef.current = null
                }
                setIsGenerating(false)
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
            {/* Sloyd-style Header with Credits */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm">Text-to-3D</h4>
                        <p className="text-white/50 text-xs">Powered by Roblox Cube3D</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400">{localCredits}</span>
                    <span className="text-xs text-white/50">credits</span>
                </div>
            </div>

            {/* Style Selection - Sloyd style */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                    <Palette className="w-3 h-3" />
                    <span>Select Style:</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {STYLE_OPTIONS.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`relative overflow-hidden rounded-xl border transition-all text-center aspect-[4/3] ${selectedStyle === style.id
                                ? "border-purple-500/50 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/50"
                                : "border-white/10 hover:border-white/20"
                                }`}
                        >
                            {/* Background gradient */}
                            <div className={`absolute inset-0 ${style.id === "realistic" ? "bg-gradient-to-br from-gray-700 to-gray-900" :
                                    style.id === "stylized" ? "bg-gradient-to-br from-pink-600/80 to-purple-800/80" :
                                        style.id === "lowpoly" ? "bg-gradient-to-br from-cyan-500/80 to-blue-700/80" :
                                            "bg-gradient-to-br from-pink-400/80 to-red-600/80"
                                }`} />
                            {/* Icon */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl mb-1">{style.icon}</span>
                            </div>
                            {/* Label */}
                            <span className={`absolute bottom-2 left-0 right-0 text-xs font-medium ${selectedStyle === style.id ? "text-white" : "text-white/80"}`}>
                                {style.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Prompt Input - Sloyd style */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your 3D model... (e.g., medieval sword, treasure chest, sci-fi helmet)"
                    className="w-full pl-11 pr-20 py-4 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                    disabled={isGenerating}
                    onKeyDown={(e) => e.key === "Enter" && !isGenerating && prompt.trim() && localCredits > 0 && generateModel()}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 bg-black/40 px-2 py-1 rounded">
                    1 credit
                </span>
            </div>

            {/* Generate Button - Sloyd style gradient */}
            <button
                onClick={generateModel}
                disabled={isGenerating || localCredits <= 0 || !prompt.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base hover:scale-[1.01] active:scale-[0.99]"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating 3D Model...</span>
                    </>
                ) : (
                    <>
                        <Wand2 className="w-5 h-5" />
                        Generate 3D Model
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
                        <span className="text-xs text-white/50">Powered by Cube3D</span>
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
                <div className={`mt-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10 border border-purple-500/30 overflow-hidden animate-[slide-up_0.3s_ease-out] ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
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

                                        {/* Dropdown Menu */}
                                        {showExportDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
                                                <a
                                                    href={generatedModel.model_url}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
                                                    onClick={() => setShowExportDropdown(false)}
                                                >
                                                    <Download className="w-4 h-4 text-green-400" />
                                                    <div>
                                                        <p className="text-white text-sm font-medium">GLB Format</p>
                                                        <p className="text-white/50 text-xs">Best for Roblox Studio</p>
                                                    </div>
                                                </a>
                                                {generatedModel.formats?.fbx && (
                                                    <a
                                                        href={generatedModel.formats.fbx}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
                                                        onClick={() => setShowExportDropdown(false)}
                                                    >
                                                        <Download className="w-4 h-4 text-blue-400" />
                                                        <div>
                                                            <p className="text-white text-sm font-medium">FBX Format</p>
                                                            <p className="text-white/50 text-xs">For Unity, Unreal, Blender</p>
                                                        </div>
                                                    </a>
                                                )}
                                                {generatedModel.formats?.obj && (
                                                    <a
                                                        href={generatedModel.formats.obj}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                                                        onClick={() => setShowExportDropdown(false)}
                                                    >
                                                        <Download className="w-4 h-4 text-orange-400" />
                                                        <div>
                                                            <p className="text-white text-sm font-medium">OBJ Format</p>
                                                            <p className="text-white/50 text-xs">Universal 3D format</p>
                                                        </div>
                                                    </a>
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
        </div>
    )
}


"use client"

import { useState, useRef, useEffect } from "react"
import { X, ExternalLink, Maximize2, Minimize2, AlertCircle, Download, Loader2 } from "lucide-react"

interface SloydEmbedModalProps {
    isOpen: boolean
    onClose: () => void
    onModelGenerated?: (modelUrl: string) => void
}

export function SloydEmbedModal({ isOpen, onClose, onModelGenerated }: SloydEmbedModalProps) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true)
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all ${isFullscreen ? "w-full h-full max-w-none rounded-none" : "w-full max-w-5xl h-[80vh]"
                }`}>
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                            <span className="text-xl">🎨</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">3D Model Generator</h2>
                            <p className="text-xs text-white/60">Powered by Sloyd AI</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href="https://app.sloyd.ai/labs/text-to-3d"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-5 h-5" />
                            ) : (
                                <Maximize2 className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            <p className="text-white/60">Loading Sloyd AI...</p>
                        </div>
                    </div>
                )}

                {/* Sloyd iframe */}
                <iframe
                    ref={iframeRef}
                    src="https://app.sloyd.ai/labs/text-to-3d"
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    allow="clipboard-write"
                    title="Sloyd AI 3D Generator"
                />

                {/* Bottom info bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Generate your model, then download and add it to your gallery</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">Pro tip: Sign in to Sloyd for better results & history</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Inline Sloyd embed component for the forge page
export function SloydInlineEmbed({ className = "" }: { className?: string }) {
    const [isLoading, setIsLoading] = useState(true)

    return (
        <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] ${className}`}>
            {/* Loading state */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0a0a]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <p className="text-white/60 text-sm">Loading 3D Generator...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center p-3 bg-gradient-to-b from-black/90 via-black/70 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-xs">🎨</span>
                    </div>
                    <span className="text-xs font-semibold text-white">AI Model Generator</span>
                </div>
            </div>

            {/* Sloyd iframe */}
            <iframe
                src="https://app.sloyd.ai/labs/text-to-3d"
                className="w-full h-full border-0"
                style={{ minHeight: "500px" }}
                onLoad={() => setIsLoading(false)}
                allow="clipboard-write"
                title="Sloyd AI 3D Generator"
            />
        </div>
    )
}


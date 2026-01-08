"use client"

import { useState, useEffect, useRef } from "react"
import { Download, Eye, Trash2, Loader2, Box, Calendar, RotateCw, ZoomIn, Maximize2, X } from "lucide-react"

interface SavedModel {
    id: string
    name: string
    prompt: string
    style: string
    model_url: string
    preview_url: string | null
    created_at: string
}

// Load model-viewer script
const loadModelViewer = () => {
    if (typeof window !== 'undefined' && !document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement('script')
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js'
        script.type = 'module'
        document.head.appendChild(script)
    }
}

// 3D Viewer Component
function ModelViewer3D({ src, alt }: { src: string; alt: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadModelViewer()

        const checkAndCreate = () => {
            if (containerRef.current && customElements.get('model-viewer')) {
                const viewer = document.createElement('model-viewer')
                viewer.setAttribute('src', src)
                viewer.setAttribute('alt', alt)
                viewer.setAttribute('camera-controls', '')
                viewer.setAttribute('auto-rotate', '')
                viewer.setAttribute('shadow-intensity', '1')
                viewer.style.width = '100%'
                viewer.style.height = '100%'
                viewer.style.backgroundColor = 'transparent'

                viewer.addEventListener('load', () => setIsLoading(false))

                containerRef.current.innerHTML = ''
                containerRef.current.appendChild(viewer)
            } else {
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
        <div ref={containerRef} className="w-full h-full relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}
        </div>
    )
}

export function MyGallery() {
    const [models, setModels] = useState<SavedModel[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedModel, setSelectedModel] = useState<SavedModel | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => {
        loadModelViewer()
        fetchModels()
    }, [])

    const fetchModels = async () => {
        try {
            const response = await fetch('/api/gallery')
            const data = await response.json()
            if (data.success) {
                setModels(data.models || [])
            }
        } catch (error) {
            console.error('Failed to fetch gallery:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteModel = async (id: string) => {
        if (!confirm('Delete this model from your gallery?')) return

        setDeleting(id)
        try {
            const response = await fetch(`/api/gallery/${id}`, { method: 'DELETE' })
            if (response.ok) {
                setModels(models.filter(m => m.id !== id))
            }
        } catch (error) {
            console.error('Failed to delete:', error)
        } finally {
            setDeleting(null)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    return (
        <div className="glassmorphism rounded-2xl overflow-hidden border-purple-500/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">My Gallery</h2>
                            <p className="text-xs text-white/60">{models.length} saved 3D models</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchModels}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white flex items-center gap-2 text-sm"
                    >
                        <RotateCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Gallery Grid - Larger */}
            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3" />
                        <p className="text-white/50 text-sm">Loading your gallery...</p>
                    </div>
                ) : models.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        <Box className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-base font-medium">No models yet</p>
                        <p className="text-sm mt-2">Generate 3D models above to see them here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {models.map((model) => (
                            <div
                                key={model.id}
                                className="group relative bg-[#2a2a3e] rounded-lg overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all"
                            >
                                {/* Preview/3D Viewer */}
                                <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800 relative">
                                    {model.model_url ? (
                                        <ModelViewer3D src={model.model_url} alt={model.name} />
                                    ) : model.preview_url ? (
                                        <img
                                            src={model.preview_url}
                                            alt={model.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Box className="w-8 h-8 text-white/20" />
                                        </div>
                                    )}

                                    {/* Hover Controls */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setSelectedModel(model)}
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                            title="View Full"
                                        >
                                            <Maximize2 className="w-4 h-4 text-white" />
                                        </button>
                                        {model.model_url && (
                                            <a
                                                href={model.model_url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-green-500/80 hover:bg-green-500 rounded-lg transition-colors"
                                                title="Download GLB"
                                            >
                                                <Download className="w-4 h-4 text-white" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => deleteModel(model.id)}
                                            disabled={deleting === model.id}
                                            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            {deleting === model.id ? (
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4 text-white" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Style Badge */}
                                    <div className="absolute top-1 left-1">
                                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-purple-500/80 text-white">
                                            {model.style || 'realistic'}
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-2">
                                    <h3 className="text-xs font-medium text-white truncate">{model.name}</h3>
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-white/40">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {formatDate(model.created_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fullscreen Modal */}
            {selectedModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setSelectedModel(null)}>
                    <div className="relative w-full max-w-4xl h-[80vh] m-4 bg-[#1a1a2e] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-bold">{selectedModel.name}</h3>
                                    <p className="text-white/50 text-sm">{selectedModel.prompt}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedModel.model_url && (
                                        <a
                                            href={selectedModel.model_url}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg text-white font-semibold text-sm flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download GLB
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setSelectedModel(null)}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3D Viewer */}
                        <div className="w-full h-full">
                            {selectedModel.model_url && (
                                <ModelViewer3D src={selectedModel.model_url} alt={selectedModel.name} />
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <RotateCw className="w-3 h-3" />
                                <span>Drag to rotate</span>
                                <span className="mx-1">•</span>
                                <ZoomIn className="w-3 h-3" />
                                <span>Scroll to zoom</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

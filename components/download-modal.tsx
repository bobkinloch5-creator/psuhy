"use client"

import { useState } from "react"
import { X, Download } from "lucide-react"

interface DownloadModalProps {
    creationId: string
    creationName: string
    isOpen: boolean
    onClose: () => void
}

export function DownloadModal({ creationId, creationName, isOpen, onClose }: DownloadModalProps) {
    const [selectedFormat, setSelectedFormat] = useState<"fbx" | "obj" | "gltf">("fbx")
    const [isDownloading, setIsDownloading] = useState(false)

    if (!isOpen) return null

    const handleDownload = async () => {
        setIsDownloading(true)

        try {
            const response = await fetch("/api/models/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    creationId,
                    format: selectedFormat,
                }),
            })

            const data = await response.json()

            if (data.success && data.downloadUrl) {
                // Create download link
                const link = document.createElement("a")
                link.href = data.downloadUrl
                link.download = data.fileName || `${creationName}.${selectedFormat}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                onClose()
            } else {
                alert("Download failed. Please try again.")
            }
        } catch (error) {
            console.error("Download error:", error)
            alert("Download failed. Please try again.")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-foreground">Download 3D Model</h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <div className="text-sm font-medium text-muted-foreground mb-3">Select Format</div>
                        <div className="space-y-2">
                            {[
                                { value: "fbx", label: "FBX", desc: "Recommended for Roblox Studio" },
                                { value: "obj", label: "OBJ", desc: "Universal 3D format" },
                                { value: "gltf", label: "GLTF/GLB", desc: "Modern web standard" },
                            ].map((format) => (
                                <button
                                    key={format.value}
                                    onClick={() => setSelectedFormat(format.value as any)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedFormat === format.value
                                            ? "border-orange-500 bg-orange-500/10"
                                            : "border-border hover:border-orange-500/50"
                                        }`}
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-foreground">{format.label}</div>
                                        <div className="text-xs text-muted-foreground">{format.desc}</div>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFormat === format.value
                                                ? "border-orange-500 bg-orange-500"
                                                : "border-border"
                                            }`}
                                    >
                                        {selectedFormat === format.value && (
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <>Preparing Download...</>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Download {selectedFormat.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}

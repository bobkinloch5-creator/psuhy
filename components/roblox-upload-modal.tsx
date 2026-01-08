"use client"

import { useState } from "react"
import { X, Upload, ExternalLink, CheckCircle2 } from "lucide-react"

interface RobloxUploadModalProps {
    creationId: string
    creationName: string
    creationPrompt: string
    isOpen: boolean
    onClose: () => void
}

export function RobloxUploadModal({
    creationId,
    creationName,
    creationPrompt,
    isOpen,
    onClose,
}: RobloxUploadModalProps) {
    const [assetName, setAssetName] = useState(creationName)
    const [description, setDescription] = useState(creationPrompt)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadComplete, setUploadComplete] = useState(false)
    const [assetId, setAssetId] = useState("")
    const [assetUrl, setAssetUrl] = useState("")

    if (!isOpen) return null

    const handleUpload = async () => {
        setIsUploading(true)

        try {
            const response = await fetch("/api/models/upload-roblox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    creationId,
                    assetName,
                    description,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setUploadComplete(true)
                setAssetId(data.assetId)
                setAssetUrl(data.assetUrl)
            } else {
                alert("Upload failed. Please check your Roblox API key and try again.")
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Upload failed. Please try again.")
        } finally {
            setIsUploading(false)
        }
    }

    const resetAndClose = () => {
        setUploadComplete(false)
        setAssetId("")
        setAssetUrl("")
        onClose()
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={resetAndClose} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Upload to Roblox</h3>
                        </div>
                        <button
                            onClick={resetAndClose}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!uploadComplete ? (
                        <>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">
                                        Asset Name
                                    </label>
                                    <input
                                        type="text"
                                        value={assetName}
                                        onChange={(e) => setAssetName(e.target.value)}
                                        className="w-full px-4 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="My Awesome Model"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground mb-2 block">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-24"
                                        placeholder="Generated with BlaxSmith AI"
                                    />
                                </div>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                                <div className="text-sm text-green-300 space-y-1">
                                    <div>✓ Format: FBX (Roblox compatible)</div>
                                    <div>✓ Will appear in your Roblox inventory</div>
                                    <div>✓ Ready to use in Roblox Studio</div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !assetName.trim()}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Uploading to Roblox...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload to Roblox
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h4 className="text-xl font-bold text-foreground mb-2">Upload Successful!</h4>
                            <p className="text-muted-foreground mb-6">
                                Your model has been uploaded to Roblox
                            </p>

                            {assetUrl && (
                                <a
                                    href={assetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all mb-4"
                                >
                                    View in Roblox
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}

                            <div className="bg-secondary rounded-xl p-4 text-left">
                                <div className="text-xs text-muted-foreground mb-1">Asset ID</div>
                                <div className="font-mono text-sm text-foreground">{assetId}</div>
                            </div>

                            <button
                                onClick={resetAndClose}
                                className="w-full mt-4 px-6 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}


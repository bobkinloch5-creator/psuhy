"use client"

import { useState } from "react"
import { X, Key, Loader2, CheckCircle2 } from "lucide-react"

interface LicenseModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (licenseData: any) => void
}

export function LicenseModal({ isOpen, onClose, onSuccess }: LicenseModalProps) {
    const [licenseKey, setLicenseKey] = useState("")
    const [isValidating, setIsValidating] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    if (!isOpen) return null

    const handleValidate = async () => {
        if (!licenseKey.trim()) {
            setError("Please enter a license key")
            return
        }

        setIsValidating(true)
        setError("")

        try {
            const response = await fetch("/api/license/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: licenseKey }),
            })

            const data = await response.json()

            if (data.success) {
                setSuccess(true)
                // Store license in localStorage
                localStorage.setItem("forge_license", JSON.stringify({
                    key: licenseKey,
                    tier: data.tier,
                    credits: data.credits,
                    username: data.username,
                    validatedAt: Date.now(),
                }))

                setTimeout(() => {
                    onSuccess(data)
                    onClose()
                }, 1500)
            } else {
                setError(data.error || "Invalid license key")
            }
        } catch (err) {
            setError("Connection failed. Please try again.")
        } finally {
            setIsValidating(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                <Key className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Forge License</h3>
                                <p className="text-sm text-muted-foreground">Enter your license key</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <h4 className="text-lg font-bold text-foreground mb-2">License Activated!</h4>
                            <p className="text-muted-foreground">Loading your workspace...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    License Key
                                </label>
                                <input
                                    type="text"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === "Enter" && handleValidate()}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center text-lg"
                                    disabled={isValidating}
                                />
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    ❌ {error}
                                </div>
                            )}

                            <button
                                onClick={handleValidate}
                                disabled={isValidating || !licenseKey.trim()}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <Key className="w-5 h-5" />
                                        Validate License
                                    </>
                                )}
                            </button>

                            <div className="mt-6 text-center">
                                <p className="text-xs text-muted-foreground">
                                    Don't have a license?{" "}
                                    <a href="https://discord.gg/sC9A9Fzss3" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                        Get one here
                                    </a>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}


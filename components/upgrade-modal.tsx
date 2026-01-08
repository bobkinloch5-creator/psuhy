"use client"

import { useState } from "react"
import { X, Sparkles, Zap, Crown, Check, Loader2 } from "lucide-react"

interface UpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    currentTier: string
}

export function UpgradeModal({ isOpen, onClose, currentTier }: UpgradeModalProps) {
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen) return null

    const tiers = [
        {
            name: "Free",
            price: "$0",
            period: "/month",
            icon: <Sparkles className="w-8 h-8" />,
            gradient: "from-gray-500 to-gray-700",
            features: [
                { text: "50 AI Chat Prompts/month", included: true },
                { text: "5 Model Generations/month", included: true },
                { text: "2 World Generations/month", included: true },
                { text: "Basic 3D Preview", included: true },
                { text: "Roblox Plugin Access", included: true },
                { text: "Advanced AI Models", included: false },
                { text: "Priority Support", included: false },
                { text: "Early Feature Access", included: false },
            ],
            current: currentTier === "free",
            available: true,
        },
        {
            name: "Pro",
            price: "Coming Soon",
            period: "",
            icon: <Crown className="w-8 h-8" />,
            gradient: "from-purple-500 via-pink-500 to-orange-500",
            features: [
                { text: "100 AI Chat Prompts/month", included: true },
                { text: "50 Model Generations/month", included: true },
                { text: "20 World Generations/month", included: true },
                { text: "Advanced 3D Preview", included: true },
                { text: "Roblox Plugin Access", included: true },
                { text: "Advanced AI Models", included: true },
                { text: "Priority Support", included: true },
                { text: "Early Feature Access", included: true },
            ],
            current: currentTier === "pro",
            available: false,
            badge: "Coming Soon",
        },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 z-10"
                >
                    <X className="w-5 h-5 text-white" />
                </button>

                {/* Header */}
                <div className="p-8 pb-6 text-center border-b border-white/10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 mb-4">
                        <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
                        Upgrade Your Forge
                    </h2>
                    <p className="text-white/60 text-lg">
                        Choose the perfect plan for your creative journey
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative overflow-hidden rounded-2xl border-2 transition-all ${tier.current
                                    ? "border-orange-500/50 shadow-lg shadow-orange-500/20"
                                    : "border-white/10 hover:border-white/20"
                                } ${tier.name === "Pro" ? "md:scale-105" : ""}`}
                        >
                            {/* Background gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-10`} />

                            {/* Badge */}
                            {tier.badge && (
                                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
                                    {tier.badge}
                                </div>
                            )}

                            {tier.current && (
                                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-400 text-xs font-bold">
                                    Current Plan
                                </div>
                            )}

                            <div className="relative p-8">
                                {/* Icon */}
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${tier.gradient} mb-4`}>
                                    {tier.icon}
                                </div>

                                {/* Name & Price */}
                                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                        {tier.price}
                                    </span>
                                    {tier.period && (
                                        <span className="text-white/40 text-sm">{tier.period}</span>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className={`mt-0.5 ${feature.included ? "text-green-400" : "text-white/20"}`}>
                                                {feature.included ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <X className="w-5 h-5" />
                                                )}
                                            </div>
                                            <span className={feature.included ? "text-white/80" : "text-white/30"}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                {tier.name === "Free" ? (
                                    <button
                                        disabled={tier.current}
                                        className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${tier.current
                                                ? "bg-white/5 text-white/40 cursor-not-allowed"
                                                : "bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:shadow-lg"
                                            }`}
                                    >
                                        {tier.current ? "Current Plan" : "Downgrade"}
                                    </button>
                                ) : (
                                    <button
                                        disabled={!tier.available || isLoading}
                                        onClick={() => {
                                            if (tier.available) {
                                                setIsLoading(true)
                                                // Payment integration will go here
                                            }
                                        }}
                                        className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${tier.available
                                                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
                                                : "bg-gradient-to-r from-purple-900 to-pink-900 text-white/60 cursor-not-allowed"
                                            }`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : tier.available ? (
                                            <>
                                                <Zap className="w-5 h-5" />
                                                Upgrade to Pro
                                            </>
                                        ) : (
                                            <>
                                                <Crown className="w-5 h-5" />
                                                Coming Soon
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 text-center">
                    <p className="text-white/40 text-sm">
                        💳 Secure payment processing • 🔒 Cancel anytime • 📧 Email support
                    </p>
                </div>
            </div>
        </div>
    )
}


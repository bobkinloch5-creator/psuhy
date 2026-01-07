"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Zap, Brain, Rocket } from "lucide-react"

export default function PremiumOnboarding() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)

    useEffect(() => {
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem("blaxsmith_onboarding_complete")
        if (!hasSeenOnboarding) {
            setTimeout(() => setIsOpen(true), 1000) // Show after 1 second
        }
    }, [])

    const completeOnboarding = () => {
        localStorage.setItem("blaxsmith_onboarding_complete", "true")
        setIsOpen(false)
    }

    const steps = [
        {
            icon: <Sparkles className="w-12 h-12" />,
            title: "Welcome to BlaxSmith AI",
            description: "Your elite AI development partner for Roblox games",
            content: (
                <div className="space-y-4">
                    <p className="text-lg">
                        <strong className="text-orange-400">BlaxSmith AI</strong> uses{" "}
                        <strong className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            MasterForge™
                        </strong>{" "}
                        and{" "}
                        <strong className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                            ForgeMind™
                        </strong>
                        —the smartest Roblox AI in existence.
                    </p>
                    <div className="bg-card border border-orange-500/30 rounded-xl p-4">
                        <h4 className="font-bold mb-2 text-orange-400">✨ What You Get:</h4>
                        <ul className="space-y-2 text-sm">
                            <li>• Complete Roblox Creator Docs knowledge</li>
                            <li>• 1M+ Creator Store assets with exact IDs</li>
                            <li>• Production-grade code generation</li>
                            <li>• Auto-generated insertion scripts</li>
                            <li>• 3D model generation with Sloyd</li>
                        </ul>
                    </div>
                </div>
            ),
        },
        {
            icon: <Brain className="w-12 h-12" />,
            title: "AI Intelligence Tiers",
            description: "Choose your AI power level",
            content: (
                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"></div>
                            <h4 className="font-bold text-yellow-400">MasterForge™ Ultra</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Claude Sonnet 4 • Maximum intelligence • Professional studio quality • Unlimited creativity
                        </p>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                            <h4 className="font-bold text-orange-400">ForgeMind™ Pro</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Claude Haiku + GPT-4o • Elite code generation • Complete Creator Store access
                        </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                            <h4 className="font-bold text-blue-400">ForgeMind™ Lite</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Grok-3 • Smart Roblox AI • Perfect for learning & experimentation
                        </p>
                    </div>
                </div>
            ),
        },
        {
            icon: <Zap className="w-12 h-12" />,
            title: "How to Use",
            description: "Start creating in 3 simple steps",
            content: (
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                            1
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">Choose What to Generate</h4>
                            <p className="text-sm text-muted-foreground">
                                Scripts, Worlds, Systems, or 3D Models— just type what you want
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                            2
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">AI Creates It Instantly</h4>
                            <p className="text-sm text-muted-foreground">
                                MasterForge/ForgeMind generates professional-grade code with Creator Store assets
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                            3
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">Use in Roblox Studio</h4>
                            <p className="text-sm text-muted-foreground">
                                Plugin auto-syncs, or copy-paste the code— it's plug-and-play!
                            </p>
                        </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mt-4">
                        <p className="text-sm">
                            <strong className="text-green-400">Pro Tip:</strong> Be specific in your prompts!
                            "Create a sword combat system with blocking and combos" gets better results than just "sword script"
                        </p>
                    </div>
                </div>
            ),
        },
        {
            icon: <Rocket className="w-12 h-12" />,
            title: "Ready to Create!",
            description: "Let's build something amazing",
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6 text-center">
                        <h4 className="text-2xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            You're All Set!
                        </h4>
                        <p className="text-muted-foreground">
                            Start generating with {" "}
                            <span className="text-yellow-400 font-bold">MasterForge™</span> or {" "}
                            <span className="text-orange-400 font-bold">ForgeMind™</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="group bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/50 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🛠️</div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-orange-400">3D Model Generation</h5>
                                    <p className="text-xs text-muted-foreground">Characters, props, buildings - production-ready</p>
                                </div>
                            </div>
                        </div>

                        <div className="group bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-500/50 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🌍</div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-yellow-400">World Generation</h5>
                                    <p className="text-xs text-muted-foreground">Complete environments with lighting & assets</p>
                                </div>
                            </div>
                        </div>

                        <div className="group bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-4 hover:border-red-500/50 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">💻</div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-red-400">Studio Integration</h5>
                                    <p className="text-xs text-muted-foreground">Direct sync to Roblox Studio - instant insertion</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                        Need help? Join our{" "}
                        <a
                            href="https://discord.gg/XMG5DbkEuB"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            Discord community
                        </a>
                    </p>
                </div>
            ),
        },
    ]

    if (!isOpen) return null

    const currentStepData = steps[currentStep]

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border-2 border-orange-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-orange-500/20">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/50">
                                {currentStepData.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                                    {currentStepData.title}
                                </h2>
                                <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={completeOnboarding}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">{currentStepData.content}</div>

                {/* Footer */}
                <div className="border-t border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                            {steps.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-2 rounded-full transition-all ${index === currentStep
                                        ? "w-8 bg-gradient-to-r from-orange-500 to-red-500"
                                        : "w-2 bg-muted"
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {currentStep + 1} / {steps.length}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="px-6 py-3 bg-muted rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        {currentStep < steps.length - 1 ? (
                            <button
                                onClick={() => setCurrentStep(currentStep + 1)}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={completeOnboarding}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                            >
                                Start Creating! 🚀
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

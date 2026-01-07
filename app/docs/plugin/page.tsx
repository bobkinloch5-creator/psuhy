export default function PluginDocsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
            {/* Animated background effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

            {/* Premium Header */}
            <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50 shadow-2xl shadow-orange-500/10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <a
                            href="/forge"
                            className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
                        >
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back to Forge</span>
                        </a>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/50">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                                    BlaxSmith AI
                                </div>
                                <div className="text-xs text-orange-400/80">Plugin Setup</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="max-w-5xl mx-auto px-6 py-16 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-6">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-orange-400 text-sm font-semibold">Easy 5-Minute Setup</span>
                    </div>

                    <h1 className="text-7xl font-black mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent animate-gradient">
                            Roblox Studio Plugin
                        </span>
                    </h1>
                    <p className="text-2xl text-white/60 max-w-2xl mx-auto">
                        Connect your Studio to BlaxSmith AI and unlock instant model generation
                    </p>
                </div>

                {/* Premium Step Cards */}
                <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-500/30 backdrop-blur-xl p-8 hover:border-blue-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative flex items-start gap-6">
                            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                                1
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-4">Download the Plugin</h3>
                                <ol className="space-y-3 text-white/80 text-lg">
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-400 font-bold">→</span>
                                        <span>Go to <a href="https://blaxsmith.dev/forge" className="text-blue-400 hover:text-blue-300 underline">blaxsmith.dev/forge</a></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-400 font-bold">→</span>
                                        <span>Scroll to <strong className="text-white">Roblox Studio Plugin</strong> section</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-400 font-bold">→</span>
                                        <span>Click <strong className="text-white">Download Plugin</strong> button</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-400 font-bold">→</span>
                                        <span>Save <code className="px-2 py-1 bg-black/40 rounded text-cyan-400">BlaxSmithPlugin.lua</code></span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 backdrop-blur-xl p-8 hover:border-green-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative flex items-start gap-6">
                            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                                2
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-4">Install in Roblox Studio</h3>
                                <ol className="space-y-3 text-white/80 text-lg">
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 font-bold">→</span>
                                        <span>Open <strong className="text-white">Roblox Studio</strong></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 font-bold">→</span>
                                        <span>Click <strong className="text-white">Plugins</strong> tab → <strong>Plugins Folder</strong></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 font-bold">→</span>
                                        <span>Copy <code className="px-2 py-1 bg-black/40 rounded text-emerald-400">BlaxSmithPlugin.lua</code> into folder</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 font-bold">→</span>
                                        <span><strong className="text-white">Restart</strong> Roblox Studio</span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 backdrop-blur-xl p-8 hover:border-purple-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative flex items-start gap-6">
                            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                                3
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-4">Configure Discord ID</h3>
                                <ol className="space-y-3 text-white/80 text-lg">
                                    <li className="flex items-start gap-3">
                                        <span className="text-purple-400 font-bold">→</span>
                                        <span>Open <code className="px-2 py-1 bg-black/40 rounded text-pink-400">BlaxSmithPlugin.lua</code> with text editor</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-purple-400 font-bold">→</span>
                                        <span>Find: <code className="px-2 py-1 bg-black/40 rounded text-pink-400">local USER_ID = "YOUR_DISCORD_ID_HERE"</code></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-purple-400 font-bold">→</span>
                                        <span>Replace with your Discord ID from blaxsmith.dev</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-purple-400 font-bold">→</span>
                                        <span><strong className="text-white">Save</strong> and restart Studio</span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/30 to-red-900/20 border border-orange-500/30 backdrop-blur-xl p-8 hover:border-orange-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative flex items-start gap-6">
                            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                                4
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-4">Enable HTTP & Connect</h3>
                                <ol className="space-y-3 text-white/80 text-lg">
                                    <li className="flex items-start gap-3">
                                        <span className="text-orange-400 font-bold">→</span>
                                        <span>In Studio: <strong className="text-white">File → Settings → Network</strong></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-orange-400 font-bold">→</span>
                                        <span>Check ✅ <strong className="text-white">Allow HTTP Requests</strong></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-orange-400 font-bold">→</span>
                                        <span>Find <strong className="text-white">BlaxSmith AI</strong> in toolbar</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-orange-400 font-bold">→</span>
                                        <span>Click <strong className="text-white">Connect</strong> button → See 🟢 Connected!</span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Help Section */}
                <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 backdrop-blur-xl">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-yellow-400 mb-2">Need Help?</h4>
                            <p className="text-white/70 mb-4">Having trouble? Check out these resources:</p>
                            <div className="flex gap-4">
                                <a href="/about" className="text-orange-400 hover:text-orange-300 underline">Team Page</a>
                                <span className="text-white/30">•</span>
                                <a href="/forge" className="text-orange-400 hover:text-orange-300 underline">Back to Forge</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 mt-16">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-white/40 text-sm mb-2">Crafted with 🔥 by the BlaxSmith Team</p>
                    <p className="text-white/30 text-xs">© 2026 blaxsmith.dev • All rights reserved</p>
                </div>
            </footer>
        </div>
    )
}

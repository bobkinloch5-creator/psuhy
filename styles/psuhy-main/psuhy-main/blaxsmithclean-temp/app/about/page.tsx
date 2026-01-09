import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Code, Sparkles, Zap, Github, Twitter } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
            {/* Animated background effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Premium Header */}
            <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50 shadow-2xl shadow-orange-500/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/forge"
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Forge</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/50">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                                BlaxSmith AI
                            </div>
                            <div className="text-xs text-orange-400/80">About Us</div>
                        </div>
                    </div>

                    <Link
                        href="/docs/plugin"
                        className="text-orange-400 hover:text-orange-300 transition-colors font-semibold"
                    >
                        Plugin Docs
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-6 animate-pulse">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-orange-400 text-sm font-semibold">Powered by Advanced AI</span>
                    </div>

                    <h1 className="text-7xl font-black mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                            Forged By
                        </span>
                    </h1>
                    <p className="text-2xl text-white/60 max-w-3xl mx-auto leading-relaxed">
                        Meet the masterminds revolutionizing Roblox game development with cutting-edge AI technology
                    </p>
                </div>

                {/* Team Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-20">
                    {/* Creator 1: goldbergjoe100 */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/5 to-orange-500/10 border border-orange-500/20 backdrop-blur-xl hover:border-orange-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

                        <div className="relative p-8">
                            {/* Avatar & Name */}
                            <div className="flex items-start gap-6 mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-orange-500/50 group-hover:scale-110 transition-transform">
                                        G
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-gray-900 animate-pulse" />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-3xl font-bold text-white mb-2">goldbergjoe100</h3>
                                    <p className="text-orange-400 font-semibold mb-4">Lead Developer & Visionary</p>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-xs font-medium">
                                            🤖 AI Expert
                                        </span>
                                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-medium">
                                            💻 Full-Stack Dev
                                        </span>
                                        <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-xs font-medium">
                                            🎮 Roblox Pro
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            <p className="text-white/80 leading-relaxed mb-6 text-lg">
                                Master of the forge, goldbergjoe100 brings his expertise in AI and game development to revolutionize Roblox creation.
                                Passionate about empowering developers with cutting-edge tools, he's on a mission to make game development more accessible
                                and efficient for everyone. When not coding, you'll find him forging new ideas and pushing the boundaries of what's possible.
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-orange-400 mb-1">1000+</div>
                                    <div className="text-xs text-white/50">Models Generated</div>
                                </div>
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-orange-400 mb-1">500+</div>
                                    <div className="text-xs text-white/50">Worlds Created</div>
                                </div>
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-orange-400 mb-1">24/7</div>
                                    <div className="text-xs text-white/50">Forging</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Creator 2: Lil'Nug of Wisdom */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-blue-500/10 border border-blue-500/20 backdrop-blur-xl hover:border-blue-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

                        <div className="relative p-8">
                            {/* Avatar & Name */}
                            <div className="flex items-start gap-6 mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/50 group-hover:scale-110 transition-transform">
                                        N
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-gray-900 animate-pulse" style={{ animationDelay: '0.5s' }} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-3xl font-bold text-white mb-2">Lil'Nug of Wisdom</h3>
                                    <p className="text-blue-400 font-semibold mb-4">Co-Creator & Innovator</p>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-medium">
                                            🌍 World Gen Expert
                                        </span>
                                        <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-medium">
                                            🎨 Creative Systems
                                        </span>
                                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
                                            💡 Innovation
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            <p className="text-white/80 leading-relaxed mb-6 text-lg">
                                The wisdom behind the forge, Lil'Nug of Wisdom contributes deep insights into world generation and creative systems.
                                With a keen eye for detail and a passion for innovation, they help shape BlaxSmith AI into a platform that truly
                                understands developers' needs. Their creative energy and technical prowess are the spark that ignites the forge.
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-blue-400 mb-1">2000+</div>
                                    <div className="text-xs text-white/50">Ideas Sparked</div>
                                </div>
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-blue-400 mb-1">100%</div>
                                    <div className="text-xs text-white/50">Wisdom</div>
                                </div>
                                <div className="text-center p-4 bg-black/40 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                                    <div className="text-3xl font-bold text-blue-400 mb-1">∞</div>
                                    <div className="text-xs text-white/50">Innovation</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mission Statement */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-xl p-12 text-center mb-12 hover:border-purple-500/40 transition-all duration-500 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

                    <div className="relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/50 group-hover:scale-110 transition-transform">
                            <Zap className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-5xl font-bold text-white mb-6">Our Mission</h2>
                        <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                            To empower every Roblox developer with AI-powered tools that transform ideas into reality.
                            We're building the future of game development – <span className="text-orange-400 font-bold">one forge at a time</span>.
                        </p>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                    <Link
                        href="/forge"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/50 transition-all hover:scale-105"
                    >
                        <Sparkles className="w-6 h-6" />
                        Start Creating Now
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 mt-16">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-white/40 text-sm mb-2">Crafted with 🔥 by the BlaxSmith Team</p>
                    <p className="text-white/30 text-xs">© 2026 blaxsmith.dev • All rights reserved</p>
                </div>
            </footer>
        </div>
    )
}

import Image from "next/image"
import Link from "next/link"

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/60 backdrop-blur-xl">
            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
                            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                                BlaxSmith AI
                            </span>
                        </div>
                        <p className="text-zinc-400 text-sm">
                            The #1 AI-powered creation studio for Roblox developers. Generate 3D models, get AI assistance, and supercharge your game development.
                        </p>
                        {/* Social Links */}
                        <div className="flex items-center gap-4 pt-4">
                            <a
                                href="https://discord.gg/xdFVu6cagw"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-[#5865F2]/20 hover:bg-[#5865F2]/40 rounded-xl flex items-center justify-center transition-colors"
                                title="Join Discord"
                            >
                                <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.youtube.com/@Blaxsmith-studio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-red-500/20 hover:bg-red-500/40 rounded-xl flex items-center justify-center transition-colors"
                                title="YouTube Channel"
                            >
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                            <a
                                href="https://twitter.com/blaxsmith"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                                title="Twitter/X"
                            >
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Product</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/forge" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    AI Chat
                                </Link>
                            </li>
                            <li>
                                <Link href="/forge" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    3D Model Generator
                                </Link>
                            </li>
                            <li>
                                <Link href="/plugin" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Roblox Plugin
                                </Link>
                            </li>
                            <li>
                                <Link href="/#pricing" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Resources</h3>
                        <ul className="space-y-3">
                            <li>
                                <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Discord Community
                                </a>
                            </li>
                            <li>
                                <a href="https://www.youtube.com/@Blaxsmith-studio" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    YouTube Tutorials
                                </a>
                            </li>
                            <li>
                                <Link href="/plugin" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Plugin Documentation
                                </Link>
                            </li>
                            <li>
                                <a href="mailto:support@blaxsmith.dev" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Contact Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/privacy" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/refund" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Refund Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-zinc-500 text-sm">
                        © {new Date().getFullYear()} BlaxSmith AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-orange-400 transition-colors text-sm">
                            Join our Discord
                        </a>
                        <span className="text-zinc-700">•</span>
                        <a href="mailto:support@blaxsmith.dev" className="text-zinc-500 hover:text-orange-400 transition-colors text-sm">
                            support@blaxsmith.dev
                        </a>
                    </div>
                </div>

                {/* Bug Report Notice */}
                <div className="text-center mt-8 pt-6 border-t border-white/5">
                    <p className="text-zinc-500 text-sm">
                        🐛 Found a bug or have feedback? <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Report it on our Discord</a>
                    </p>
                </div>
            </div>
        </footer>
    )
}

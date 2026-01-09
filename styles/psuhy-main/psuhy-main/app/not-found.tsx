import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex items-center justify-center p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 text-center max-w-lg">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image
                        src="/blaxsmith-logo.png"
                        alt="BlaxSmith AI"
                        width={120}
                        height={120}
                        className="opacity-80"
                    />
                </div>

                {/* 404 Text */}
                <div className="relative mb-6">
                    <h1 className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 leading-none">
                        404
                    </h1>
                    <div className="absolute inset-0 text-[150px] font-black text-orange-500/10 blur-xl leading-none">
                        404
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                    Looks like this page got lost in the forge. The resource you're looking for doesn't exist or has been moved.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-orange-500/25"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/forge"
                        className="px-8 py-3 bg-zinc-800 border border-white/10 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all hover:scale-105"
                    >
                        Open Forge
                    </Link>
                </div>

                {/* Decorative Element */}
                <div className="mt-12 flex justify-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>

                {/* Support Link */}
                <p className="mt-8 text-zinc-500 text-sm">
                    Need help?{" "}
                    <Link href="https://discord.gg/blaxsmith" className="text-orange-400 hover:underline">
                        Join our Discord
                    </Link>
                </p>
            </div>
        </div>
    )
}

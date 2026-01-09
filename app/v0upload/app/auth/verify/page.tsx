import Link from "next/link"
import Image from "next/image"
import { Mail, ArrowRight } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-green-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={56} height={56} className="w-14 h-14" />
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
            BlaxSmith AI
          </span>
        </Link>

        {/* Verify Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <Mail className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">Check Your Email</h1>
          <p className="text-zinc-400 mb-8">
            We sent a verification link to your email address. Click the link to activate your account and start
            creating.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <p className="text-orange-300 text-sm">
                Didn't receive the email? Check your spam folder or request a new verification link.
              </p>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-semibold transition-colors"
            >
              Back to login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

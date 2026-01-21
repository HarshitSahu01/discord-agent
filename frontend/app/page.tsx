'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import { LayoutDashboard, LogIn, Github } from 'lucide-react'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 flex flex-col items-center gap-8 text-center px-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            System Online
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            SmartBoi
            <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Discord Agent
            </span>
          </h1>
          <p className="max-w-xl text-lg text-gray-400 leading-relaxed mx-auto">
            The next generation of Discord automation. Manage instructions, memory, and channel access from a clinical, glassmorphic interface.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
          {loading ? (
            <div className="h-12 w-40 bg-gray-900 animate-pulse rounded-full border border-gray-800" />
          ) : session ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-blue-600 font-semibold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <LayoutDashboard size={20} />
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white font-semibold text-black transition-all hover:bg-gray-200 hover:scale-105 active:scale-95 shadow-lg"
            >
              <LogIn size={20} />
              Admin Login
            </Link>
          )}

          <a
            href="https://github.com"
            target="_blank"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-gray-900 border border-gray-800 font-semibold text-gray-300 transition-all hover:bg-gray-800 hover:border-gray-700"
          >
            <Github size={20} />
            View Source
          </a>
        </div>
      </main>

      <footer className="absolute bottom-8 text-gray-500 text-sm">
        &copy; 2026 SmartBoi AI Systems. All rights reserved.
      </footer>
    </div>
  )
}

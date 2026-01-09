"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Monitor, Smartphone, Settings2 } from 'lucide-react'

type ViewMode = 'auto' | 'mobile' | 'desktop'

interface ViewModeContextType {
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void
    isMobileView: boolean
}

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: 'auto',
    setViewMode: () => { },
    isMobileView: false,
})

export function useViewMode() {
    return useContext(ViewModeContext)
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewMode, setViewModeState] = useState<ViewMode>('auto')
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('blaxsmith-view-mode') as ViewMode
        if (saved && ['auto', 'mobile', 'desktop'].includes(saved)) {
            setViewModeState(saved)
        }
    }, [])

    // Track window size
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const setViewMode = (mode: ViewMode) => {
        setViewModeState(mode)
        localStorage.setItem('blaxsmith-view-mode', mode)

        // Apply body class for CSS targeting
        document.body.classList.remove('force-mobile', 'force-desktop')
        if (mode === 'mobile') {
            document.body.classList.add('force-mobile')
        } else if (mode === 'desktop') {
            document.body.classList.add('force-desktop')
        }
    }

    // Determine if current view should be mobile
    const isMobileView = viewMode === 'mobile' || (viewMode === 'auto' && windowWidth < 768)

    return (
        <ViewModeContext.Provider value={{ viewMode, setViewMode, isMobileView }}>
            {children}
        </ViewModeContext.Provider>
    )
}

export function ViewModeToggle() {
    const { viewMode, setViewMode } = useViewMode()

    return (
        <div className="view-mode-toggle flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'mobile'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                title="Mobile View"
            >
                <Smartphone className="w-4 h-4" />
            </button>
            <button
                onClick={() => setViewMode('auto')}
                className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'auto'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                title="Auto (Responsive)"
            >
                <Settings2 className="w-4 h-4" />
            </button>
            <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'desktop'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                title="Desktop View"
            >
                <Monitor className="w-4 h-4" />
            </button>
        </div>
    )
}

"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Center, useGLTF, Html, useProgress } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect } from "react"
import { X, Download, Eye, RotateCcw, Box, Layers, ChevronDown, Play, Check } from "lucide-react"
import * as THREE from "three"

interface ModelViewer3DProps {
    modelUrl?: string
    modelName: string
    onClose: () => void
    vertices?: number
    faces?: number
}

// Export formats with support info
const EXPORT_FORMATS = [
    { format: "GLB", geometry: true, materials: true, animation: true, notes: "Web native. Compact, fast-loading, widely supported", recommended: true },
    { format: "FBX", geometry: true, materials: true, animation: true, notes: "Robust DCC/game-engine format" },
    { format: "OBJ", geometry: true, materials: false, animation: false, notes: "Widely supported legacy format" },
    { format: "USD", geometry: true, materials: false, animation: true, notes: "Pixar USD (Universal Scene Description)" },
    { format: "USDZ", geometry: true, materials: true, animation: true, notes: "Pixar USDZ archive (With textures)" },
    { format: "BLEND", geometry: true, materials: true, animation: true, notes: "Blender native format" },
]

// Animation presets
const ANIMATION_PRESETS = [
    "Walk", "Run", "Jump", "Crouch", "Climb", "Pop dance", "Sword swing", "Reload", "Evade"
]

// Export category tabs
const EXPORT_CATEGORIES = ["Game Dev", "3D Print", "Roblox", "Blender", "Web Embed"]

// Progress loader component
function Loader() {
    const { progress } = useProgress()
    return (
        <Html center>
            <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-white text-sm">{progress.toFixed(0)}%</span>
            </div>
        </Html>
    )
}

// Model component that loads GLB/GLTF
function Model({ url, wireframe }: { url: string; wireframe: boolean }) {
    const { scene } = useGLTF(url)
    const ref = useRef<THREE.Group>(null)

    useEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((mat) => {
                            if (mat instanceof THREE.MeshStandardMaterial) {
                                mat.wireframe = wireframe
                            }
                        })
                    } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                        mesh.material.wireframe = wireframe
                    }
                }
                mesh.castShadow = true
                mesh.receiveShadow = true
            }
        })
    }, [scene, wireframe])

    return <primitive ref={ref} object={scene} />
}

// Placeholder model when no URL
function PlaceholderModel({ wireframe }: { wireframe: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005
        }
    })

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial
                color="#ff6b00"
                metalness={0.7}
                roughness={0.2}
                envMapIntensity={1.5}
                wireframe={wireframe}
            />
        </mesh>
    )
}

// Export Modal
function ExportModal({ onClose, onExport, modelName }: { onClose: () => void; onExport: (format: string) => void; modelName: string }) {
    const [selectedCategory, setSelectedCategory] = useState("Game Dev")
    const [selectedFormat, setSelectedFormat] = useState("GLB")

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-8" onClick={onClose}>
            <div className="bg-[#0a1525] rounded-2xl border border-cyan-500/30 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                {/* Category tabs */}
                <div className="flex border-b border-white/10">
                    {EXPORT_CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-4 text-sm font-medium transition-colors ${selectedCategory === cat
                                    ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Format selector */}
                    <div className="mb-6">
                        <label className="text-white/60 text-sm mb-2 block">Export Format</label>
                        <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white"
                        >
                            {EXPORT_FORMATS.map((f) => (
                                <option key={f.format} value={f.format}>
                                    {f.format} {f.recommended ? "(Recommended)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Recommended badge */}
                    {EXPORT_FORMATS.find(f => f.format === selectedFormat)?.recommended && (
                        <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded mb-6">
                            GLB RECOMMENDED
                        </div>
                    )}

                    {/* Format comparison table */}
                    <div className="bg-white/5 rounded-xl overflow-hidden mb-6">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-white/60 text-sm">
                                    <th className="text-left px-4 py-3 font-medium">Format</th>
                                    <th className="text-center px-4 py-3 font-medium">Geometry</th>
                                    <th className="text-center px-4 py-3 font-medium">Materials</th>
                                    <th className="text-center px-4 py-3 font-medium">Animation</th>
                                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {EXPORT_FORMATS.map((f) => (
                                    <tr
                                        key={f.format}
                                        className={`border-b border-white/5 cursor-pointer transition-colors ${selectedFormat === f.format ? "bg-cyan-500/10" : "hover:bg-white/5"
                                            }`}
                                        onClick={() => setSelectedFormat(f.format)}
                                    >
                                        <td className="px-4 py-3 text-white font-medium">{f.format}</td>
                                        <td className="px-4 py-3 text-center">
                                            {f.geometry ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {f.materials ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {f.animation ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-sm">{f.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Download button */}
                    <button
                        onClick={() => onExport(selectedFormat)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                    >
                        <Download className="w-5 h-5" />
                        Download {selectedFormat}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Animation Modal
function AnimationModal({ onClose, onAnimate }: { onClose: () => void; onAnimate: (animation: string) => void }) {
    const [selectedAnimation, setSelectedAnimation] = useState("Walk")
    const [customPrompt, setCustomPrompt] = useState("")

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-8" onClick={onClose}>
            <div className="bg-[#0a1525] rounded-2xl border border-cyan-500/30 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-6">Select a preset animation</h3>

                {/* Animation presets */}
                <div className="space-y-2 mb-6">
                    {ANIMATION_PRESETS.map((anim) => (
                        <button
                            key={anim}
                            onClick={() => setSelectedAnimation(anim)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedAnimation === anim
                                    ? "bg-cyan-500/20 border border-cyan-500/50"
                                    : "bg-white/5 border border-white/10 hover:bg-white/10"
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAnimation === anim ? "border-cyan-400" : "border-white/30"
                                }`}>
                                {selectedAnimation === anim && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                            </div>
                            <span className="text-white">{anim}</span>
                        </button>
                    ))}
                </div>

                {/* Text to motion */}
                <div className="mb-6">
                    <p className="text-white/60 text-sm mb-2">Or create with <span className="text-white font-medium">text to motion</span></p>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="How would you like your character to move?"
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 h-24 resize-none"
                    />
                </div>

                {/* Animate button */}
                <button
                    onClick={() => onAnimate(customPrompt || selectedAnimation)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all"
                >
                    <Play className="w-5 h-5" />
                    Animate
                </button>
            </div>
        </div>
    )
}

export function ModelViewer3D({ modelUrl, modelName, onClose, vertices = 21000, faces = 37000 }: ModelViewer3DProps) {
    const [wireframe, setWireframe] = useState(false)
    const [autoRotate, setAutoRotate] = useState(true)
    const [showExportModal, setShowExportModal] = useState(false)
    const [showAnimationModal, setShowAnimationModal] = useState(false)

    const handleExport = (format: string) => {
        if (modelUrl) {
            const link = document.createElement('a')
            link.href = modelUrl
            link.download = `${modelName}.${format.toLowerCase()}`
            link.click()
        }
        setShowExportModal(false)
    }

    const handleAnimate = (animation: string) => {
        console.log("Animate with:", animation)
        setShowAnimationModal(false)
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/95 z-[200] flex">
                {/* 3D Viewer Area */}
                <div className="flex-1 relative">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Wireframe Toggle */}
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span className="text-white text-sm">Wireframe</span>
                        <button
                            onClick={() => setWireframe(!wireframe)}
                            className={`w-12 h-6 rounded-full transition-colors ${wireframe ? 'bg-cyan-500' : 'bg-white/20'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${wireframe ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Rating buttons */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 text-white/60 text-sm">
                        <span>Rate the Result:</span>
                        <button className="p-2 bg-white/10 hover:bg-green-500/30 rounded-lg transition-colors">👍</button>
                        <button className="p-2 bg-white/10 hover:bg-red-500/30 rounded-lg transition-colors">👎</button>
                    </div>

                    {/* 3D Canvas */}
                    <Canvas shadows className="w-full h-full">
                        <Suspense fallback={<Loader />}>
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
                            <spotLight position={[0, 10, 0]} intensity={0.5} angle={0.5} />
                            <Environment preset="studio" />
                            <PerspectiveCamera makeDefault position={[4, 2, 6]} fov={45} />
                            <Center>
                                {modelUrl ? <Model url={modelUrl} wireframe={wireframe} /> : <PlaceholderModel wireframe={wireframe} />}
                            </Center>
                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                                <planeGeometry args={[50, 50]} />
                                <meshStandardMaterial color="#0a1525" />
                            </mesh>
                            <gridHelper args={[50, 50, '#1a2535', '#0d1520']} position={[0, -1.99, 0]} />
                            <OrbitControls enableZoom enablePan enableRotate autoRotate={autoRotate} autoRotateSpeed={1} minDistance={2} maxDistance={30} target={[0, 0, 0]} />
                        </Suspense>
                    </Canvas>
                </div>

                {/* Right Sidebar */}
                <div className="w-80 bg-[#0a1525] border-l border-white/10 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">BlaxSmith AI</p>
                            <p className="text-white/70 text-sm">Generated Model</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-cyan-400 mb-2">{modelName}</h2>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full w-fit mb-6">
                        <Box className="w-3 h-3" /> Text to 3D
                    </span>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                            <span className="text-white/60">Vertices:</span>
                            <span className="text-white font-medium">{vertices.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-white/60">Faces:</span>
                            <span className="text-white font-medium">{faces.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between cursor-pointer">
                            <span className="text-white">{modelName.toLowerCase()}</span>
                            <ChevronDown className="w-4 h-4 text-white/40" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="space-y-3">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                        >
                            <Download className="w-5 h-5" /> Export GLB <ChevronDown className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setShowAnimationModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
                        >
                            <Play className="w-5 h-5" /> Animate
                        </button>

                        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20">
                            <Layers className="w-5 h-5" /> Auto Rig
                        </button>

                        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20">
                            <Eye className="w-5 h-5" /> Edit Image
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} onExport={handleExport} modelName={modelName} />}
            {showAnimationModal && <AnimationModal onClose={() => setShowAnimationModal(false)} onAnimate={handleAnimate} />}
        </>
    )
}


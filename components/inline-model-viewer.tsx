"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { Loader2 } from "lucide-react"

interface InlineModelViewerProps {
    modelUrl: string
    modelName?: string
}

export function InlineModelViewer({ modelUrl, modelName }: InlineModelViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const animationIdRef = useRef<number | null>(null)

    useEffect(() => {
        if (!containerRef.current || !modelUrl) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = 300

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0a0a)
        sceneRef.current = scene

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(5, 5, 5)
        cameraRef.current = camera

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        scene.add(ambientLight)

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2)
        directionalLight1.position.set(5, 10, 7.5)
        directionalLight1.castShadow = true
        scene.add(directionalLight1)

        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.5)
        directionalLight2.position.set(-5, 5, -5)
        scene.add(directionalLight2)

        const directionalLight3 = new THREE.DirectionalLight(0xff8844, 0.3)
        directionalLight3.position.set(0, -5, 5)
        scene.add(directionalLight3)

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20)
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.2,
        })
        const ground = new THREE.Mesh(groundGeometry, groundMaterial)
        ground.rotation.x = -Math.PI / 2
        ground.position.y = -2
        ground.receiveShadow = true
        scene.add(ground)

        // Grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
        gridHelper.position.y = -1.99
        scene.add(gridHelper)

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.minDistance = 2
        controls.maxDistance = 20
        controls.maxPolarAngle = Math.PI / 2
        controlsRef.current = controls

        // Load Model
        const loader = new GLTFLoader()
        loader.load(
            modelUrl,
            (gltf) => {
                const model = gltf.scene

                // Enable shadows
                model.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        child.castShadow = true
                        child.receiveShadow = true

                        const mesh = child as THREE.Mesh
                        if (mesh.material) {
                            // Ensure materials are properly set up for PBR rendering
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach((mat) => {
                                    if (mat instanceof THREE.MeshStandardMaterial) {
                                        mat.needsUpdate = true
                                        mat.envMapIntensity = 1.0
                                    }
                                })
                            } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                                mesh.material.needsUpdate = true
                                mesh.material.envMapIntensity = 1.0
                            }
                        }
                    }
                })

                // Center and scale model
                const box = new THREE.Box3().setFromObject(model)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                const maxDim = Math.max(size.x, size.y, size.z)
                const scale = 3 / maxDim
                model.scale.multiplyScalar(scale)
                model.position.sub(center.multiplyScalar(scale))
                model.position.y -= (size.y * scale) / 2 - 2

                scene.add(model)

                // Auto-rotate
                const animate = () => {
                    animationIdRef.current = requestAnimationFrame(animate)
                    model.rotation.y += 0.003
                    controls.update()
                    renderer.render(scene, camera)
                }
                animate()
            },
            undefined,
            (error) => {
                console.error("Error loading model:", error)
            }
        )

        // Handle resize
        const handleResize = () => {
            if (!container) return
            const newWidth = container.clientWidth
            const newHeight = 300
            camera.aspect = newWidth / newHeight
            camera.updateProjectionMatrix()
            renderer.setSize(newWidth, newHeight)
        }
        window.addEventListener("resize", handleResize)

        // Cleanup
        return () => {
            window.removeEventListener("resize", handleResize)
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current)
            }
            if (rendererRef.current) {
                container.removeChild(rendererRef.current.domElement)
                rendererRef.current.dispose()
            }
        }
    }, [modelUrl])

    return (
        <div className="relative">
            <div ref={containerRef} className="w-full h-[300px] rounded-lg overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black border border-white/10" />
            <div className="absolute top-2 left-2 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20">
                <p className="text-xs text-white/80 font-mono">🎨 3D Preview{modelName ? ` - ${modelName}` : ""}</p>
            </div>
        </div>
    )
}


"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Plus, FolderOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Project {
    id: string
    name: string
    description?: string
    thumbnail_url?: string
    updated_at: string
}

export function ProjectSelector() {
    const [projects, setProjects] = useState<Project[]>([])
    const [activeProject, setActiveProject] = useState<Project | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        loadProjects()
    }, [])

    const loadProjects = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from("users")
            .select("id, active_project_id")
            .eq("discord_id", user.id)
            .single()

        if (userData) {
            const { data: projectsData } = await supabase
                .from("projects")
                .select("*")
                .eq("user_id", userData.id)
                .order("updated_at", { ascending: false })
                .limit(10)

            if (projectsData) {
                setProjects(projectsData)

                // Set active project
                if (userData.active_project_id) {
                    const active = projectsData.find((p) => p.id === userData.active_project_id)
                    if (active) setActiveProject(active)
                }
            }
        }
    }

    const selectProject = async (project: Project) => {
        setActiveProject(project)
        setIsOpen(false)

        // Update active project in database
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (userData) {
            await supabase
                .from("users")
                .update({ active_project_id: project.id })
                .eq("id", userData.id)
        }
    }

    const createProject = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (userData) {
            const { data: newProject } = await supabase
                .from("projects")
                .insert({
                    user_id: userData.id,
                    name: `Project ${projects.length + 1}`,
                    description: "A new Roblox project",
                })
                .select()
                .single()

            if (newProject) {
                await loadProjects()
                selectProject(newProject)
            }
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
            >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                    {activeProject ? activeProject.name : "No Project"}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
                        <div className="p-2 border-b border-border">
                            <button
                                onClick={createProject}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create New Project
                            </button>
                        </div>
                        <div className="max-h-64 overflow-auto p-2">
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => selectProject(project)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${activeProject?.id === project.id
                                            ? "bg-orange-500/20 border border-orange-500/30"
                                            : "hover:bg-secondary"
                                        }`}
                                >
                                    {project.thumbnail_url ? (
                                        <img
                                            src={project.thumbnail_url}
                                            alt={project.name}
                                            className="w-10 h-10 rounded object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                            {project.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{project.name}</div>
                                        {project.description && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {project.description}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}


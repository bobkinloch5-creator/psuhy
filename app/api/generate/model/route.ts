import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getSloydToken, clearSloydTokenCache } from "@/lib/sloyd"

// Sloyd API endpoints - using the correct text-to-3d endpoint
const SLOYD_JOBS_API = "https://horizon-be-server-blue-124265032526.us-central1.run.app/api/jobs/text-to-3d"
const SLOYD_STATUS_API = "https://horizon-be-server-blue-124265032526.us-central1.run.app/api/jobs"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { prompt, style } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] [Model Gen] User:", user.id, "Prompt:", prompt)

    // Look up user by auth ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, generation_credits, model_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    // If not found by id, try discord_id for backwards compatibility
    if (userError || !userData) {
      console.log("[v0] [Model Gen] User not found by id, trying discord_id...")
      const result = await supabase
        .from("users")
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[v0] [Model Gen] User lookup error:", userError)
      // Create user if they don't exist
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          discord_id: user.id,
          email: user.email,
          generation_credits: 10,
          model_credits: 50,
        })
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .single()

      if (createError || !newUser) {
        console.error("[v0] [Model Gen] Failed to create user:", createError)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      userData = newUser
    }

    const isPremium =
      userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    if (!isPremium && userData.model_credits <= 0) {
      return NextResponse.json(
        {
          error: "No model generation credits remaining",
          upgradeUrl: "/upgrade",
        },
        { status: 403 },
      )
    }

    // Get Sloyd token (auto-refreshes using cookies if available)
    const sloydToken = await getSloydToken()
    if (!sloydToken) {
      console.error("[v0] [Model Gen] No Sloyd token available")
      return NextResponse.json(
        {
          error: "Model generation service not configured",
          details: "Please configure SLOYD_TOKEN or SLOYD_COOKIE in environment variables",
        },
        { status: 500 },
      )
    }

    console.log("[v0] [Model Gen] Starting Sloyd job for:", prompt)

    const modelData = await generateSloydModelWithPolling(prompt, style, sloydToken, 3)

    if (!modelData) {
      return NextResponse.json(
        {
          error: "Model generation failed after retries",
          details: "The Sloyd service may be temporarily unavailable. Please try again.",
        },
        { status: 503 },
      )
    }

    console.log("[v0] [Model Gen] Sloyd success - full response:", JSON.stringify(modelData))

    // Extract GLB URL from various possible locations in the response
    const glbUrl = modelData.downloadUrl || modelData.download_url ||
      modelData.glb_url || modelData.glbUrl ||
      modelData.files?.glb || modelData.output?.glb ||
      modelData.result?.glb || modelData.data?.glb_url ||
      modelData.result?.downloadUrl || modelData.output?.downloadUrl ||
      modelData.url ||
      (modelData.files && Object.values(modelData.files).find((f: any) => typeof f === 'string' && f.includes('.glb'))) ||
      null

    // Extract preview/thumbnail URL
    const previewUrl = modelData.preview_url || modelData.previewUrl ||
      modelData.thumbnail || modelData.image ||
      modelData.result?.preview_url || modelData.output?.preview_url ||
      modelData.data?.preview_url ||
      null

    console.log("[v0] [Model Gen] Extracted URLs - GLB:", glbUrl, "Preview:", previewUrl)

    const enhancedModelData = {
      ...modelData,
      prompt: prompt,
      style: style || "realistic",
      formats: {
        glb: glbUrl,
        obj: modelData.obj_url || modelData.objUrl || modelData.files?.obj || modelData.output?.obj || null,
        fbx: modelData.fbx_url || modelData.fbxUrl || modelData.files?.fbx || modelData.output?.fbx || null,
        usdz: modelData.usdz_url || modelData.usdzUrl || modelData.files?.usdz || modelData.output?.usdz || null,
      },
      preview_url: previewUrl,
      model_url: glbUrl,
      job_id: modelData.id || modelData.job_id || null,
    }

    let autoQueued = false
    const userDiscordId = userData.discord_id || user.id

    try {
      const { data: connection } = await supabase
        .from("plugin_connections")
        .select("*")
        .eq("user_id", userDiscordId)
        .eq("is_active", true)
        .single()

      if (connection && enhancedModelData.model_url) {
        // Queue the generated model to Studio
        const { error: queueError } = await supabase.from("asset_queue").insert({
          user_id: userDiscordId,
          asset_id: enhancedModelData.model_url,
          asset_type: "GeneratedModel",
          asset_name: prompt.slice(0, 50),
          status: "pending",
          metadata: {
            model_url: enhancedModelData.model_url,
            preview_url: enhancedModelData.preview_url,
            formats: enhancedModelData.formats,
            prompt: prompt,
          },
        })

        if (!queueError) {
          autoQueued = true
          console.log("[v0] [Model Gen] Auto-queued model to Studio for user:", userDiscordId)
        }
      }
    } catch (error) {
      console.error("[v0] [Model Gen] Auto-queue error:", error)
      // Don't fail the generation if auto-queue fails
    }

    enhancedModelData.auto_queued = autoQueued

    // Save creation
    const { data: creation, error: creationError } = await supabase
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "model",
        name: prompt.slice(0, 50),
        description: prompt,
        prompt: prompt,
        preview_url: enhancedModelData.preview_url,
        asset_data: enhancedModelData,
        status: "ready",
      })
      .select()
      .single()

    if (creationError) {
      console.error("[v0] [Model Gen] Creation insert error:", creationError)
      // Don't fail - still return the model
    }

    if (!isPremium) {
      const balanceBefore = userData.model_credits
      const balanceAfter = balanceBefore - 1

      await supabase.from("users").update({ model_credits: balanceAfter }).eq("id", userData.id)

      // Log transaction
      await supabase
        .from("credit_transactions")
        .insert({
          user_id: userData.id,
          transaction_type: "deduction",
          credit_type: "model",
          amount: 1,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reason: "3D model generation",
          creation_id: creation?.id,
          ip_address: request.headers.get("x-forwarded-for") || "unknown",
        })
        .catch((err) => console.error("[v0] [Model Gen] Transaction log error:", err))

      return NextResponse.json({
        success: true,
        creation: creation,
        model: enhancedModelData,
        creditsRemaining: balanceAfter,
      })
    }

    return NextResponse.json({
      success: true,
      creation: creation,
      model: enhancedModelData,
      creditsRemaining: "unlimited",
    })
  } catch (error: any) {
    console.error("[v0] [Model Gen] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Generation failed",
        details: error.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    )
  }
}

async function generateSloydModelWithPolling(
  prompt: string,
  style: string | undefined,
  token: string,
  maxRetries: number,
): Promise<any | null> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] [Model Gen] Sloyd attempt ${attempt}/${maxRetries}`)

      // Step 1: Create generation job
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const jobResponse = await fetch(SLOYD_JOBS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
          Origin: "https://app.sloyd.ai",
          Referer: "https://app.sloyd.ai/",
        },
        body: JSON.stringify({
          prompt: prompt,
          type: "text-to-3d",
          style: style || "realistic",
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text()
        console.error(`[v0] [Model Gen] Sloyd job creation error (attempt ${attempt}):`, jobResponse.status, errorText)
        lastError = new Error(`Sloyd API error: ${jobResponse.status}`)

        // Don't retry on auth errors
        if (jobResponse.status === 401 || jobResponse.status === 403) {
          console.error("[v0] [Model Gen] Auth error - token may be invalid")
          return null
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
        continue
      }

      const jobData = await jobResponse.json()
      console.log("[v0] [Model Gen] Job created:", jobData.id || jobData.job_id)

      // Step 2: Poll for completion (if job ID is provided)
      if (jobData.id || jobData.job_id) {
        const jobId = jobData.id || jobData.job_id
        const modelData = await pollSloydJob(jobId, 60) // Poll for up to 60 seconds

        if (modelData) {
          return modelData
        }
      }

      // If no job ID, return the initial response (synchronous API)
      return jobData
    } catch (error: any) {
      console.error(`[v0] [Model Gen] Attempt ${attempt} failed:`, error.message)
      lastError = error

      if (error.name === "AbortError") {
        console.error("[v0] [Model Gen] Request timed out")
      }

      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  console.error("[v0] [Model Gen] All retry attempts failed:", lastError)
  return null
}

async function pollSloydJob(jobId: string, maxWaitSeconds: number): Promise<any | null> {
  const startTime = Date.now()
  const pollInterval = 2000 // Poll every 2 seconds

  while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
    try {
      const statusResponse = await fetch(`${SLOYD_STATUS_API}/${jobId}`, {
        headers: {
          Authorization: process.env.SLOYD_TOKEN!,
          Origin: "https://app.sloyd.ai",
          Referer: "https://app.sloyd.ai/",
        },
      })

      if (!statusResponse.ok) {
        console.error("[v0] [Model Gen] Job status check failed:", statusResponse.status)
        return null
      }

      const statusData = await statusResponse.json()
      console.log("[v0] [Model Gen] Job status:", statusData.status)

      // Check if job is complete
      if (statusData.status === "completed" || statusData.status === "success" || statusData.state === "completed") {
        console.log("[v0] [Model Gen] Job completed successfully")
        return statusData
      }

      // Check if job failed
      if (statusData.status === "failed" || statusData.status === "error" || statusData.state === "failed") {
        console.error("[v0] [Model Gen] Job failed:", statusData.error || "Unknown error")
        return null
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    } catch (error) {
      console.error("[v0] [Model Gen] Polling error:", error)
      return null
    }
  }

  console.error("[v0] [Model Gen] Job polling timeout after", maxWaitSeconds, "seconds")
  return null
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Sloyd API endpoints
const SLOYD_JOBS_API = "https://horizon-be-server-blue-124265032526.us-central1.run.app/api/jobs"

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

    console.log("[Model Gen] User:", user.id, "Prompt:", prompt)

    // Look up user by auth ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, generation_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    // If not found by id, try discord_id for backwards compatibility
    if (userError || !userData) {
      console.log("[Model Gen] User not found by id, trying discord_id...")
      const result = await supabase
        .from("users")
        .select("id, generation_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[Model Gen] User lookup error:", userError)
      // Create user if they don't exist
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          discord_id: user.id,
          email: user.email,
          generation_credits: 10, // Default credits
        })
        .select("id, generation_credits, subscription_tier")
        .single()

      if (createError || !newUser) {
        console.error("[Model Gen] Failed to create user:", createError)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      userData = newUser
    }

    // Check credits (allow unlimited for pro/enterprise users)
    const isPremium = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    if (!isPremium && userData.generation_credits <= 0) {
      return NextResponse.json({
        error: "No generation credits remaining",
        upgradeUrl: "/upgrade"
      }, { status: 403 })
    }

    // Check if Sloyd token is configured
    if (!process.env.SLOYD_TOKEN) {
      console.error("[Model Gen] SLOYD_TOKEN not set")
      return NextResponse.json({
        error: "Model generation service not configured",
        details: "Please configure Sloyd API token in environment variables"
      }, { status: 500 })
    }

    // Call Sloyd API with retry logic
    console.log("[Model Gen] Calling Sloyd API for:", prompt)

    const modelData = await callSloydWithRetry(prompt, style, 3)

    if (!modelData) {
      return NextResponse.json({
        error: "Model generation failed after retries",
        details: "The Sloyd service may be temporarily unavailable. Please try again."
      }, { status: 503 })
    }

    console.log("[Model Gen] Sloyd response:", JSON.stringify(modelData).substring(0, 300))

    // Save creation
    const { data: creation, error: creationError } = await supabase
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "model",
        name: prompt.slice(0, 50),
        description: prompt,
        prompt: prompt,
        preview_url: modelData.preview_url || modelData.previewUrl || modelData.thumbnail || null,
        asset_data: modelData,
        status: "ready",
      })
      .select()
      .single()

    if (creationError) {
      console.error("[Model Gen] Creation insert error:", creationError)
      // Don't fail - still return the model
    }

    // Deduct credits only for non-premium users
    if (!isPremium) {
      const balanceBefore = userData.generation_credits
      const balanceAfter = balanceBefore - 1

      await supabase
        .from("users")
        .update({ generation_credits: balanceAfter })
        .eq("id", userData.id)

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: userData.id,
        transaction_type: "deduction",
        credit_type: "generation",
        amount: 1,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason: "3D model generation",
        creation_id: creation?.id,
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
      }).catch(err => console.error("[Model Gen] Transaction log error:", err))

      return NextResponse.json({
        success: true,
        creation: creation,
        model: modelData,
        creditsRemaining: balanceAfter,
      })
    }

    return NextResponse.json({
      success: true,
      creation: creation,
      model: modelData,
      creditsRemaining: "unlimited",
    })
  } catch (error: any) {
    console.error("[Model Gen] Unexpected error:", error)
    return NextResponse.json({
      error: "Generation failed",
      details: error.message || "An unexpected error occurred. Please try again."
    }, { status: 500 })
  }
}

// Call Sloyd API with retry logic
async function callSloydWithRetry(prompt: string, style: string | undefined, maxRetries: number): Promise<any | null> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Model Gen] Sloyd attempt ${attempt}/${maxRetries}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(SLOYD_JOBS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": process.env.SLOYD_TOKEN!,
          "Origin": "https://app.sloyd.ai",
          "Referer": "https://app.sloyd.ai/",
        },
        body: JSON.stringify({
          prompt: prompt,
          type: "text-to-3d",
          style: style || "realistic",
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Model Gen] Sloyd API error (attempt ${attempt}):`, response.status, errorText)
        lastError = new Error(`Sloyd API error: ${response.status}`)

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          console.error("[Model Gen] Auth error - token may be invalid")
          return null
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
        continue
      }

      const modelData = await response.json()
      return modelData
    } catch (error: any) {
      console.error(`[Model Gen] Attempt ${attempt} failed:`, error.message)
      lastError = error

      if (error.name === "AbortError") {
        console.error("[Model Gen] Request timed out")
      }

      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  console.error("[Model Gen] All retry attempts failed:", lastError)
  return null
}

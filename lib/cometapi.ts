// CometAPI Configuration
// OpenAI-compatible API with 500+ models including GPT-5.2, Gemini, Claude, etc.

export const COMETAPI_BASE_URL = "https://api.cometapi.com/v1"

// Model configurations for different tasks
// Branded as ForgeMind™ and MasterForge™
export const MODELS = {
  // MasterForge™ - Premium tier with Claude Sonnet 4 (BEST)
  masterforge: {
    script: "claude-sonnet-4-20250514", // Claude Sonnet 4 - Best for code
    world: "claude-sonnet-4-20250514", // Claude Sonnet 4 - Best for everything
    system: "claude-sonnet-4-20250514", // Claude Sonnet 4 - Ultimate intelligence
  },
  // ForgeMind Pro - Budget-friendly premium
  premium: {
    script: "claude-3-5-haiku-20241022", // Claude Haiku - cheap but quality
    world: "gpt-4o-mini", // Cheap GPT model
    system: "claude-3-5-haiku-20241022",
  },
  // ForgeMind Lite - Free tier
  free: {
    script: "gemini-3-flash", // Gemini 3 Flash - Free and fast
    world: "gemini-3-flash",
    system: "gemini-3-flash",
  },
} as const

// Get model for task based on tier
export const getModelForTask = (
  task: "script" | "world" | "system",
  tier: "free" | "pro" | "enterprise" | "masterforge" = "pro"
) => {
  if (tier === "masterforge" || tier === "enterprise") {
    return MODELS.masterforge[task]
  } else if (tier === "free") {
    return MODELS.free[task]
  }
  return MODELS.premium[task]
}

// Helper to create OpenAI-compatible client config
export function getCometAPIConfig() {
  return {
    baseURL: COMETAPI_BASE_URL,
    apiKey: process.env.COMETAPI_KEY,
  }
}

// Generate text using CometAPI (OpenAI-compatible)
export async function generateWithCometAPI(
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const response = await fetch(`${COMETAPI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.COMETAPI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[CometAPI] Error:", error)
    throw new Error(`CometAPI request failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

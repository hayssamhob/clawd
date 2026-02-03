import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

// Complete list of all Windsurf models based on official documentation
// Users can specify any modelId directly, or use tier shortcuts
export const ALL_WINDSURF_MODELS: Record<string, ModelInfo> = {
  "claude-35-sonnet": {
    id: "claude-35-sonnet",
    name: "Claude 3.5 Sonnet",
    tier: "standard",
    credits: 2,
    description: "Claude 3.5 Sonnet - 2x",
    strengths: ["Anthropic Claude", "Balanced performance"],
  },
  "claude-37-sonnet": {
    id: "claude-37-sonnet",
    name: "Claude 3.7 Sonnet",
    tier: "standard",
    credits: 2,
    description: "Claude 3.7 Sonnet - 2x",
    strengths: ["Anthropic Claude", "Balanced performance"],
  },
  "claude-37-sonnet-thinking": {
    id: "claude-37-sonnet-thinking",
    name: "Claude 3.7 Sonnet (Thinking)",
    tier: "smart",
    credits: 3,
    description: "Claude 3.7 Sonnet (Thinking) - 3x",
    strengths: [
      "Anthropic Claude",
      "Balanced performance",
      "Enhanced reasoning",
    ],
  },
  "claude-haiku-45": {
    id: "claude-haiku-45",
    name: "Claude Haiku 4.5",
    tier: "cheap",
    credits: 1,
    description: "Claude Haiku 4.5 - 1x",
    strengths: ["Anthropic Claude", "Fast execution"],
  },
  "claude-opus-4-byok": {
    id: "claude-opus-4-byok",
    name: "Claude Opus 4 (BYOK)",
    tier: "free",
    credits: 0,
    description: "Claude Opus 4 (BYOK) - BYOK [Beta]",
    strengths: ["Anthropic Claude", "Premium quality", "Beta features"],
  },
  "claude-opus-4-thinking-byok": {
    id: "claude-opus-4-thinking-byok",
    name: "Claude Opus 4 (Thinking, BYOK)",
    tier: "free",
    credits: 0,
    description: "Claude Opus 4 (Thinking, BYOK) - BYOK [Beta]",
    strengths: [
      "Anthropic Claude",
      "Premium quality",
      "Enhanced reasoning",
      "Beta features",
    ],
  },
  "claude-opus-41": {
    id: "claude-opus-41",
    name: "Claude Opus 4.1",
    tier: "premium",
    credits: 20,
    description: "Claude Opus 4.1 - 20x",
    strengths: ["Anthropic Claude", "Premium quality"],
  },
  "claude-opus-41-thinking": {
    id: "claude-opus-41-thinking",
    name: "Claude Opus 4.1 (Thinking)",
    tier: "premium",
    credits: 20,
    description: "Claude Opus 4.1 (Thinking) - 20x",
    strengths: ["Anthropic Claude", "Premium quality", "Enhanced reasoning"],
  },
  "claude-opus-45": {
    id: "claude-opus-45",
    name: "Claude Opus 4.5",
    tier: "smart",
    credits: 4,
    description: "Claude Opus 4.5 - 4x",
    strengths: ["Anthropic Claude", "Premium quality"],
  },
  "claude-opus-45-thinking": {
    id: "claude-opus-45-thinking",
    name: "Claude Opus 4.5 (Thinking)",
    tier: "premium",
    credits: 5,
    description: "Claude Opus 4.5 (Thinking) - 5x",
    strengths: ["Anthropic Claude", "Premium quality", "Enhanced reasoning"],
  },
  "claude-sonnet-4": {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    tier: "standard",
    credits: 2,
    description: "Claude Sonnet 4 - 2x",
    strengths: ["Anthropic Claude", "Balanced performance"],
  },
  "claude-sonnet-4-byok": {
    id: "claude-sonnet-4-byok",
    name: "Claude Sonnet 4 (BYOK)",
    tier: "free",
    credits: 0,
    description: "Claude Sonnet 4 (BYOK) - BYOK",
    strengths: ["Anthropic Claude", "Balanced performance"],
  },
  "claude-sonnet-4-thinking-byok": {
    id: "claude-sonnet-4-thinking-byok",
    name: "Claude Sonnet 4 (Thinking, BYOK)",
    tier: "free",
    credits: 0,
    description: "Claude Sonnet 4 (Thinking, BYOK) - BYOK",
    strengths: [
      "Anthropic Claude",
      "Balanced performance",
      "Enhanced reasoning",
    ],
  },
  "claude-sonnet-4-thinking": {
    id: "claude-sonnet-4-thinking",
    name: "Claude Sonnet 4 (Thinking)",
    tier: "smart",
    credits: 3,
    description: "Claude Sonnet 4 (Thinking) - 3x",
    strengths: [
      "Anthropic Claude",
      "Balanced performance",
      "Enhanced reasoning",
    ],
  },
  "claude-sonnet-45": {
    id: "claude-sonnet-45",
    name: "Claude Sonnet 4.5",
    tier: "standard",
    credits: 2,
    description: "Claude Sonnet 4.5 - 2x [Promo]",
    strengths: [
      "Anthropic Claude",
      "Balanced performance",
      "Promotional pricing",
    ],
    isPromo: true,
    promoDescription:
      "Limited time promotional pricing - check daily for updates!",
    originalCost: "4x",
  },
  "claude-sonnet-45-1m": {
    id: "claude-sonnet-45-1m",
    name: "Claude Sonnet 4.5 (1M)",
    tier: "premium",
    credits: 10,
    description: "Claude Sonnet 4.5 (1M) - 10x",
    strengths: ["Anthropic Claude", "Balanced performance"],
  },
  "claude-sonnet-45-thinking": {
    id: "claude-sonnet-45-thinking",
    name: "Claude Sonnet 4.5 Thinking",
    tier: "smart",
    credits: 3,
    description: "Claude Sonnet 4.5 Thinking - 3x [Promo]",
    strengths: [
      "Anthropic Claude",
      "Balanced performance",
      "Enhanced reasoning",
      "Promotional pricing",
    ],
    isPromo: true,
    promoDescription:
      "Limited time promotional pricing - check daily for updates!",
    originalCost: "4x",
  },
  "deepseek-r1-0528": {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1 (0528)",
    tier: "free",
    credits: 0,
    description: "DeepSeek R1 (0528) - Free",
    strengths: ["DeepSeek"],
  },
  "deepseek-v3-0324": {
    id: "deepseek-v3-0324",
    name: "DeepSeek V3 (0324)",
    tier: "free",
    credits: 0,
    description: "DeepSeek V3 (0324) - Free",
    strengths: ["DeepSeek"],
  },
  "gemini-25-pro": {
    id: "gemini-25-pro",
    name: "Gemini 2.5 Pro",
    tier: "cheap",
    credits: 1,
    description: "Gemini 2.5 Pro - 1x",
    strengths: ["Google Gemini"],
  },
  "gemini-3-flash-high": {
    id: "gemini-3-flash-high",
    name: "Gemini 3 Flash High",
    tier: "standard",
    credits: 1.75,
    description: "Gemini 3 Flash High - 1.75x [New]",
    strengths: ["Google Gemini", "High performance", "Latest model"],
  },
  "gemini-3-flash-low": {
    id: "gemini-3-flash-low",
    name: "Gemini 3 Flash Low",
    tier: "cheap",
    credits: 1,
    description: "Gemini 3 Flash Low - 1x [New]",
    strengths: ["Google Gemini", "Cost effective", "Latest model"],
  },
  "gemini-3-flash-medium": {
    id: "gemini-3-flash-medium",
    name: "Gemini 3 Flash Medium",
    tier: "cheap",
    credits: 1,
    description: "Gemini 3 Flash Medium - 1x [New]",
    strengths: ["Google Gemini", "Latest model"],
  },
  "gemini-3-flash-minimal": {
    id: "gemini-3-flash-minimal",
    name: "Gemini 3 Flash Minimal",
    tier: "cheap",
    credits: 0.75,
    description: "Gemini 3 Flash Minimal - 0.75x [New]",
    strengths: ["Google Gemini", "Latest model"],
  },
  "gemini-3-pro-high": {
    id: "gemini-3-pro-high",
    name: "Gemini 3 Pro High",
    tier: "standard",
    credits: 2,
    description: "Gemini 3 Pro High - 2x",
    strengths: ["Google Gemini", "High performance"],
  },
  "gemini-3-pro-low": {
    id: "gemini-3-pro-low",
    name: "Gemini 3 Pro Low",
    tier: "cheap",
    credits: 1,
    description: "Gemini 3 Pro Low - 1x",
    strengths: ["Google Gemini", "Cost effective"],
  },
  "gemini-3-pro-medium": {
    id: "gemini-3-pro-medium",
    name: "Gemini 3 Pro Medium",
    tier: "standard",
    credits: 1.5,
    description: "Gemini 3 Pro Medium - 1.5x",
    strengths: ["Google Gemini"],
  },
  "gemini-3-pro-minimal": {
    id: "gemini-3-pro-minimal",
    name: "Gemini 3 Pro Minimal",
    tier: "cheap",
    credits: 1,
    description: "Gemini 3 Pro Minimal - 1x",
    strengths: ["Google Gemini"],
  },
  "glm-47": {
    id: "glm-47",
    name: "GLM 4.7",
    tier: "cheap",
    credits: 0.25,
    description: "GLM 4.7 - 0.25x [Beta]",
    strengths: ["Beta features"],
  },
  "gpt-41": {
    id: "gpt-41",
    name: "GPT-4.1",
    tier: "cheap",
    credits: 1,
    description: "GPT-4.1 - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    tier: "cheap",
    credits: 1,
    description: "GPT-4o - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-5-high-reasoning": {
    id: "gpt-5-high-reasoning",
    name: "GPT-5 (high reasoning)",
    tier: "standard",
    credits: 2,
    description: "GPT-5 (high reasoning) - 2x",
    strengths: ["OpenAI GPT", "High performance"],
  },
  "gpt-5-low-reasoning": {
    id: "gpt-5-low-reasoning",
    name: "GPT-5 (low reasoning)",
    tier: "cheap",
    credits: 0.5,
    description: "GPT-5 (low reasoning) - 0.5x",
    strengths: ["OpenAI GPT", "Cost effective"],
  },
  "gpt-5-medium-reasoning": {
    id: "gpt-5-medium-reasoning",
    name: "GPT-5 (medium reasoning)",
    tier: "cheap",
    credits: 1,
    description: "GPT-5 (medium reasoning) - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-5-codex": {
    id: "gpt-5-codex",
    name: "GPT-5-Codex",
    tier: "cheap",
    credits: 0.5,
    description: "GPT-5-Codex - 0.5x",
    strengths: ["OpenAI GPT", "Code-specialized"],
  },
  "gpt-51-high-reasoning": {
    id: "gpt-51-high-reasoning",
    name: "GPT-5.1 (high reasoning)",
    tier: "standard",
    credits: 2,
    description: "GPT-5.1 (high reasoning) - 2x",
    strengths: ["OpenAI GPT", "High performance"],
  },
  "gpt-51-high-priority": {
    id: "gpt-51-high-priority",
    name: "GPT-5.1 (high, priority)",
    tier: "smart",
    credits: 4,
    description: "GPT-5.1 (high, priority) - 4x",
    strengths: ["OpenAI GPT", "High performance"],
  },
  "gpt-51-low-reasoning": {
    id: "gpt-51-low-reasoning",
    name: "GPT-5.1 (low reasoning)",
    tier: "cheap",
    credits: 0.5,
    description: "GPT-5.1 (low reasoning) - 0.5x",
    strengths: ["OpenAI GPT", "Cost effective"],
  },
  "gpt-51-low-priority": {
    id: "gpt-51-low-priority",
    name: "GPT-5.1 (low, priority)",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.1 (low, priority) - 1x",
    strengths: ["OpenAI GPT", "Cost effective"],
  },
  "gpt-51-medium-reasoning": {
    id: "gpt-51-medium-reasoning",
    name: "GPT-5.1 (medium reasoning)",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.1 (medium reasoning) - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-51-medium-priority": {
    id: "gpt-51-medium-priority",
    name: "GPT-5.1 (medium, priority)",
    tier: "standard",
    credits: 2,
    description: "GPT-5.1 (medium, priority) - 2x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-51-no-reasoning-priority": {
    id: "gpt-51-no-reasoning-priority",
    name: "GPT-5.1 (no reasoning, priority)",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.1 (no reasoning, priority) - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-51-no-reasoning": {
    id: "gpt-51-no-reasoning",
    name: "GPT-5.1 (no reasoning)",
    tier: "cheap",
    credits: 0.5,
    description: "GPT-5.1 (no reasoning) - 0.5x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-51-codex": {
    id: "gpt-51-codex",
    name: "GPT-5.1-Codex",
    tier: "free",
    credits: 0,
    description: "GPT-5.1-Codex - Free",
    strengths: ["OpenAI GPT", "Code-specialized"],
  },
  "gpt-51-codex-low": {
    id: "gpt-51-codex-low",
    name: "GPT-5.1-Codex Low",
    tier: "free",
    credits: 0,
    description: "GPT-5.1-Codex Low - Free",
    strengths: ["OpenAI GPT", "Code-specialized", "Cost effective"],
  },
  "gpt-51-codex-max-high": {
    id: "gpt-51-codex-max-high",
    name: "GPT-5.1-Codex Max High",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.1-Codex Max High - 1x",
    strengths: ["OpenAI GPT", "Code-specialized", "High performance"],
  },
  "gpt-51-codex-max-low": {
    id: "gpt-51-codex-max-low",
    name: "GPT-5.1-Codex Max Low",
    tier: "free",
    credits: 0,
    description: "GPT-5.1-Codex Max Low - Free",
    strengths: ["OpenAI GPT", "Code-specialized", "Cost effective"],
  },
  "gpt-51-codex-max-medium": {
    id: "gpt-51-codex-max-medium",
    name: "GPT-5.1-Codex Max Medium",
    tier: "cheap",
    credits: 0.5,
    description: "GPT-5.1-Codex Max Medium - 0.5x",
    strengths: ["OpenAI GPT", "Code-specialized"],
  },
  "gpt-51-codex-mini": {
    id: "gpt-51-codex-mini",
    name: "GPT-5.1-Codex-Mini",
    tier: "free",
    credits: 0,
    description: "GPT-5.1-Codex-Mini - Free",
    strengths: ["OpenAI GPT", "Code-specialized"],
  },
  "gpt-51-codex-mini-low": {
    id: "gpt-51-codex-mini-low",
    name: "GPT-5.1-Codex-Mini Low",
    tier: "free",
    credits: 0,
    description: "GPT-5.1-Codex-Mini Low - Free",
    strengths: ["OpenAI GPT", "Code-specialized", "Cost effective"],
  },
  "gpt-52-high-reasoning": {
    id: "gpt-52-high-reasoning",
    name: "GPT-5.2 High Reasoning",
    tier: "smart",
    credits: 3,
    description: "GPT-5.2 High Reasoning - 3x",
    strengths: ["OpenAI GPT", "High performance"],
  },
  "gpt-52-high-reasoning-fast": {
    id: "gpt-52-high-reasoning-fast",
    name: "GPT-5.2 High Reasoning Fast",
    tier: "premium",
    credits: 6,
    description: "GPT-5.2 High Reasoning Fast - 6x",
    strengths: ["OpenAI GPT", "Speed optimized", "High performance"],
  },
  "gpt-52-low-reasoning": {
    id: "gpt-52-low-reasoning",
    name: "GPT-5.2 Low Reasoning",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.2 Low Reasoning - 1x",
    strengths: ["OpenAI GPT", "Cost effective"],
  },
  "gpt-52-low-reasoning-fast": {
    id: "gpt-52-low-reasoning-fast",
    name: "GPT-5.2 Low Reasoning Fast",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2 Low Reasoning Fast - 2x [Selected]",
    strengths: ["OpenAI GPT", "Speed optimized", "Cost effective"],
  },
  "gpt-52-medium-reasoning": {
    id: "gpt-52-medium-reasoning",
    name: "GPT-5.2 Medium Reasoning",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2 Medium Reasoning - 2x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-52-medium-reasoning-fast": {
    id: "gpt-52-medium-reasoning-fast",
    name: "GPT-5.2 Medium Reasoning Fast",
    tier: "smart",
    credits: 4,
    description: "GPT-5.2 Medium Reasoning Fast - 4x",
    strengths: ["OpenAI GPT", "Speed optimized"],
  },
  "gpt-52-no-reasoning": {
    id: "gpt-52-no-reasoning",
    name: "GPT-5.2 No Reasoning",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.2 No Reasoning - 1x",
    strengths: ["OpenAI GPT"],
  },
  "gpt-52-no-reasoning-fast": {
    id: "gpt-52-no-reasoning-fast",
    name: "GPT-5.2 No Reasoning Fast",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2 No Reasoning Fast - 2x",
    strengths: ["OpenAI GPT", "Speed optimized"],
  },
  "gpt-52-x-high-reasoning": {
    id: "gpt-52-x-high-reasoning",
    name: "GPT-5.2 X-High Reasoning",
    tier: "premium",
    credits: 8,
    description: "GPT-5.2 X-High Reasoning - 8x",
    strengths: ["OpenAI GPT", "High performance"],
  },
  "gpt-52-x-high-reasoning-fast": {
    id: "gpt-52-x-high-reasoning-fast",
    name: "GPT-5.2 X-High Reasoning Fast",
    tier: "premium",
    credits: 16,
    description: "GPT-5.2 X-High Reasoning Fast - 16x",
    strengths: ["OpenAI GPT", "Speed optimized", "High performance"],
  },
  "gpt-52-codex-high": {
    id: "gpt-52-codex-high",
    name: "GPT-5.2-Codex High",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2-Codex High - 2x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "High performance",
      "Latest model",
    ],
  },
  "gpt-52-codex-high-fast": {
    id: "gpt-52-codex-high-fast",
    name: "GPT-5.2-Codex High Fast",
    tier: "smart",
    credits: 4,
    description: "GPT-5.2-Codex High Fast - 4x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "Speed optimized",
      "High performance",
      "Latest model",
    ],
  },
  "gpt-52-codex-low": {
    id: "gpt-52-codex-low",
    name: "GPT-5.2-Codex Low",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.2-Codex Low - 1x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "Cost effective",
      "Latest model",
    ],
  },
  "gpt-52-codex-low-fast": {
    id: "gpt-52-codex-low-fast",
    name: "GPT-5.2-Codex Low Fast",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2-Codex Low Fast - 2x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "Speed optimized",
      "Cost effective",
      "Latest model",
    ],
  },
  "gpt-52-codex-medium": {
    id: "gpt-52-codex-medium",
    name: "GPT-5.2-Codex Medium",
    tier: "cheap",
    credits: 1,
    description: "GPT-5.2-Codex Medium - 1x [New]",
    strengths: ["OpenAI GPT", "Code-specialized", "Latest model"],
  },
  "gpt-52-codex-medium-fast": {
    id: "gpt-52-codex-medium-fast",
    name: "GPT-5.2-Codex Medium Fast",
    tier: "standard",
    credits: 2,
    description: "GPT-5.2-Codex Medium Fast - 2x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "Speed optimized",
      "Latest model",
    ],
  },
  "gpt-52-codex-xhigh": {
    id: "gpt-52-codex-xhigh",
    name: "GPT-5.2-Codex XHigh",
    tier: "smart",
    credits: 3,
    description: "GPT-5.2-Codex XHigh - 3x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "High performance",
      "Latest model",
    ],
  },
  "gpt-52-codex-xhigh-fast": {
    id: "gpt-52-codex-xhigh-fast",
    name: "GPT-5.2-Codex XHigh Fast",
    tier: "premium",
    credits: 6,
    description: "GPT-5.2-Codex XHigh Fast - 6x [New]",
    strengths: [
      "OpenAI GPT",
      "Code-specialized",
      "Speed optimized",
      "High performance",
      "Latest model",
    ],
  },
  "gpt-oss-120b-medium": {
    id: "gpt-oss-120b-medium",
    name: "GPT-OSS 120B (Medium)",
    tier: "cheap",
    credits: 0.25,
    description: "GPT-OSS 120B (Medium) - 0.25x",
    strengths: ["OpenAI GPT"],
  },
  "grok-code-fast-1": {
    id: "grok-code-fast-1",
    name: "Grok Code Fast 1",
    tier: "free",
    credits: 0,
    description: "Grok Code Fast 1 - Free",
    strengths: ["xAI Grok", "Speed optimized"],
  },
  "kimi-k2": {
    id: "kimi-k2",
    name: "Kimi K2",
    tier: "cheap",
    credits: 0.5,
    description: "Kimi K2 - 0.5x",
    strengths: ["Moonshot AI"],
  },
  "kimi-k25": {
    id: "kimi-k25",
    name: "Kimi K2.5",
    tier: "free",
    credits: 0,
    description: "Kimi K2.5 - Free [New, Promo]",
    strengths: ["Moonshot AI", "Promotional pricing", "Latest model"],
    isPromo: true,
    promoDescription:
      "Limited time promotional pricing - check daily for updates!",
    originalCost: "0.5x-1x",
  },
  "minimax-m2": {
    id: "minimax-m2",
    name: "Minimax M2",
    tier: "cheap",
    credits: 0.5,
    description: "Minimax M2 - 0.5x",
    strengths: ["General coding"],
  },
  "minimax-m21": {
    id: "minimax-m21",
    name: "Minimax M2.1",
    tier: "cheap",
    credits: 0.5,
    description: "Minimax M2.1 - 0.5x [Beta]",
    strengths: ["Beta features"],
  },
  o3: {
    id: "o3",
    name: "o3",
    tier: "cheap",
    credits: 1,
    description: "o3 - 1x",
    strengths: ["General coding"],
  },
  "o3-high-reasoning": {
    id: "o3-high-reasoning",
    name: "o3 (high reasoning)",
    tier: "cheap",
    credits: 1,
    description: "o3 (high reasoning) - 1x",
    strengths: ["High performance"],
  },
  "qwen3-coder": {
    id: "qwen3-coder",
    name: "Qwen3-Coder",
    tier: "cheap",
    credits: 0.5,
    description: "Qwen3-Coder - 0.5x",
    strengths: ["Alibaba Qwen"],
  },
  "swe-1": {
    id: "swe-1",
    name: "SWE-1",
    tier: "free",
    credits: 0,
    description: "SWE-1 - Free",
    strengths: ["Cognition AI"],
  },
  "swe-15": {
    id: "swe-15",
    name: "SWE-1.5",
    tier: "free",
    credits: 0,
    description: "SWE-1.5 - Free [New, Promo]",
    strengths: ["Cognition AI", "Promotional pricing", "Latest model"],
    isPromo: true,
    promoDescription:
      "Limited time promotional pricing - check daily for updates!",
    originalCost: "Premium (paid)",
  },
  "swe-15-fast": {
    id: "swe-15-fast",
    name: "SWE-1.5 (Fast)",
    tier: "cheap",
    credits: 0.5,
    description: "SWE-1.5 (Fast) - 0.5x [Fast, Promo]",
    strengths: ["Cognition AI", "Speed optimized", "Promotional pricing"],
    isPromo: true,
    promoDescription:
      "Limited time promotional pricing - check daily for updates!",
    originalCost: "1x",
  },
  "xai-grok-3": {
    id: "xai-grok-3",
    name: "xAI Grok-3",
    tier: "cheap",
    credits: 1,
    description: "xAI Grok-3 - 1x",
    strengths: ["xAI Grok"],
  },
  "xai-grok-3-mini-thinking": {
    id: "xai-grok-3-mini-thinking",
    name: "xAI Grok-3 mini (Thinking)",
    tier: "cheap",
    credits: 0.125,
    description: "xAI Grok-3 mini (Thinking) - 0.125x",
    strengths: ["xAI Grok", "Enhanced reasoning"],
  },
};

// Tier mappings for convenience - OpenClaw can use these or specify exact model
export const TIER_MODELS: Record<string, string> = {
  free: "swe-1.5-free",
  cheap: "deepseek-v3",
  smart: "claude-3.5-haiku",
  fast: "gemini-2.0-flash",
};

interface ModelInfo {
  id: string;
  name: string;
  tier: string;
  credits: number | string;
  description: string;
  strengths: string[];
  isPromo?: boolean;
  promoDescription?: string;
  originalCost?: string;
}

interface ModelConfig {
  tier: "cheap" | "smart" | "free";
  modelId: string;
  displayName: string;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  cheap: {
    tier: "cheap",
    modelId: "deepseek-v3",
    displayName: "DeepSeek V3",
  },
  smart: {
    tier: "smart",
    modelId: "claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
  },
  free: {
    tier: "free",
    modelId: "swe-1.5-free",
    displayName: "SWE-1.5 Free",
  },
};

export class CascadeController {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get list of all available models
   */
  getAllModels(): Record<string, ModelInfo> {
    return ALL_WINDSURF_MODELS;
  }

  /**
   * Get models filtered by tier
   */
  getModelsByTier(tier: string): ModelInfo[] {
    return Object.values(ALL_WINDSURF_MODELS).filter((m) => m.tier === tier);
  }

  /**
   * Get models with promotional pricing
   */
  getPromoModels(): ModelInfo[] {
    return Object.values(ALL_WINDSURF_MODELS).filter((m) => m.isPromo === true);
  }

  /**
   * Resolve model ID - handles both tier shortcuts and direct model IDs
   */
  resolveModelId(
    modelOrTier: string,
  ): { modelId: string; modelInfo: ModelInfo } | null {
    // Check if it's a tier shortcut
    if (TIER_MODELS[modelOrTier]) {
      const modelId = TIER_MODELS[modelOrTier];
      return {
        modelId,
        modelInfo: ALL_WINDSURF_MODELS[modelId],
      };
    }

    // Check if it's a direct model ID
    if (ALL_WINDSURF_MODELS[modelOrTier]) {
      return {
        modelId: modelOrTier,
        modelInfo: ALL_WINDSURF_MODELS[modelOrTier],
      };
    }

    // Try to find by name (case-insensitive partial match)
    const model = Object.values(ALL_WINDSURF_MODELS).find((m) =>
      m.name.toLowerCase().includes(modelOrTier.toLowerCase()),
    );

    if (model) {
      return {
        modelId: model.id,
        modelInfo: model,
      };
    }

    return null;
  }

  /**
   * Switch to any model by ID or tier
   */
  async switchModel(modelOrTier: string): Promise<{
    success: boolean;
    model: string;
    modelId: string;
    credits: number | string;
    message: string;
  }> {
    const resolved = this.resolveModelId(modelOrTier);

    if (!resolved) {
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        message: `Unknown model or tier: ${modelOrTier}. Use 'list_models' to see available options.`,
      };
    }

    const { modelId, modelInfo } = resolved;

    try {
      const vsConfig = vscode.workspace.getConfiguration();

      // Try multiple possible setting keys
      const possibleKeys = [
        "codeium.chat.model",
        "windsurf.cascade.model",
        "codeium.model",
        "windsurf.ai.model",
        "codeium.cascade.model",
      ];

      let keyFound = false;
      for (const key of possibleKeys) {
        const inspection = vsConfig.inspect(key);
        if (inspection !== undefined) {
          await vsConfig.update(
            key,
            modelId,
            vscode.ConfigurationTarget.Global,
          );
          keyFound = true;
          console.log(`Updated ${key} to ${modelId}`);
        }
      }

      // If no key found, try the most common one anyway
      if (!keyFound) {
        await vsConfig.update(
          "codeium.chat.model",
          modelId,
          vscode.ConfigurationTarget.Global,
        );
      }

      // Also save to globalState as backup
      await this.context.globalState.update(
        "windsurf.cascade.selectedModel",
        modelId,
      );

      return {
        success: true,
        model: modelInfo.name,
        modelId: modelId,
        credits: modelInfo.credits,
        message: `Switched to ${modelInfo.name} (${modelId}) - ${modelInfo.description}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        message: `Failed to switch model: ${errorMessage}`,
      };
    }
  }

  async focusCascade(): Promise<{ success: boolean; message: string }> {
    try {
      const possibleCommands = [
        "codeium.chat.focus",
        "windsurf.cascade.focus",
        "workbench.view.extension.codeium",
        "codeium.openChat",
      ];

      for (const cmd of possibleCommands) {
        try {
          await vscode.commands.executeCommand(cmd);
          return {
            success: true,
            message: `Focused Cascade using command: ${cmd}`,
          };
        } catch (e) {
          continue;
        }
      }

      return {
        success: false,
        message: "Could not find Cascade focus command",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to focus Cascade: ${errorMessage}`,
      };
    }
  }

  async sendPromptToCascade(
    prompt: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.focusCascade();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const possibleCommands = [
        "codeium.chat.sendMessage",
        "windsurf.cascade.sendPrompt",
        "codeium.sendChatMessage",
      ];

      for (const cmd of possibleCommands) {
        try {
          await vscode.commands.executeCommand(cmd, prompt);
          return {
            success: true,
            message: `Sent prompt using command: ${cmd}`,
          };
        } catch (e) {
          continue;
        }
      }

      await vscode.env.clipboard.writeText(prompt);
      await vscode.commands.executeCommand(
        "editor.action.clipboardPasteAction",
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const terminalCommands = [
        "workbench.action.terminal.acceptSelectedSuggestion",
        "workbench.action.acceptSelectedSuggestion",
      ];

      for (const cmd of terminalCommands) {
        try {
          await vscode.commands.executeCommand(cmd);
          break;
        } catch (e) {
          continue;
        }
      }

      return {
        success: true,
        message: "Sent prompt via clipboard paste (fallback method)",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to send prompt: ${errorMessage}`,
      };
    }
  }

  /**
   * Delegate task with automatic model selection support
   * OpenClaw can specify: tier (free/cheap/smart/fast) OR exact model ID OR partial model name
   */
  async delegateTask(
    prompt: string,
    modelOrTier: string = "free",
  ): Promise<{
    success: boolean;
    model: string;
    modelId: string;
    credits: number | string;
    promptSent: boolean;
    message: string;
  }> {
    const modelSwitch = await this.switchModel(modelOrTier);
    if (!modelSwitch.success) {
      return {
        success: false,
        model: "",
        modelId: "",
        credits: 0,
        promptSent: false,
        message: modelSwitch.message,
      };
    }

    const promptResult = await this.sendPromptToCascade(prompt);

    return {
      success: promptResult.success,
      model: modelSwitch.model,
      modelId: modelSwitch.modelId,
      credits: modelSwitch.credits,
      promptSent: promptResult.success,
      message: `Model: ${modelSwitch.model}. ${promptResult.message}`,
    };
  }

  async getCascadeStatus(lines: number = 10): Promise<string> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folder open";
      }

      const config = vscode.workspace.getConfiguration("windsurf-bridge");
      const resultFile = config.get<string>("resultFile", "OPENCLAW_RESULT.md");
      const resultPath = path.join(workspaceFolders[0].uri.fsPath, resultFile);

      if (!fs.existsSync(resultPath)) {
        return `Result file not found: ${resultPath}`;
      }

      const content = fs.readFileSync(resultPath, "utf-8");
      const allLines = content.split("\n");
      const lastLines = allLines.slice(-lines);

      return lastLines.join("\n");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error reading cascade status: ${errorMessage}`;
    }
  }
}

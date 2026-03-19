import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AiTool } from "../types.js";

const AI_TOOL_DIRS: Record<AiTool, string> = {
  "claude-code": ".claude",
  cursor: ".cursor",
  copilot: ".github",
  windsurf: ".windsurf",
  aider: ".",
  trae: ".trae",
  other: ".",
};

/**
 * Result returned by {@link detectAiTool}.
 * @description Indicates whether an AI tool's configuration directory was found and provides its absolute path.
 */
export interface DetectionResult {
  /** `true` if the tool's config directory exists on disk. */
  detected: boolean;
  /** Absolute path to the expected config directory for this tool. */
  configDir: string;
}

/**
 * Checks if an AI tool's config directory exists in the project.
 * @param projectDir - Absolute path to the project root.
 * @param tool - The AI tool to check for.
 * @returns Detection result with whether the directory exists and its path.
 * @example
 * const result = detectAiTool("/home/user/myapp", "claude-code");
 * // result.detected === true if /home/user/myapp/.claude exists
 */
export function detectAiTool(projectDir: string, tool: AiTool): DetectionResult {
  const configDir = join(projectDir, AI_TOOL_DIRS[tool]);
  return {
    detected: existsSync(configDir),
    configDir,
  };
}

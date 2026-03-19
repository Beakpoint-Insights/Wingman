import type { Phase, AiTool } from "../types.js";
import { ClaudeCodeEmitter } from "./claude-code.js";
import { CursorEmitter } from "./cursor.js";
import { CopilotEmitter } from "./copilot.js";
import { WindsurfEmitter } from "./windsurf.js";
import { AiderEmitter } from "./aider.js";
import { TraeEmitter } from "./trae.js";
import { OtherEmitter } from "./other.js";

/**
 * Writes phase prompts to an AI coding tool's native configuration location.
 * @description Each supported AI tool has its own concrete implementation. The Emitter is
 * responsible for both writing prompts and cleaning up any artefacts it creates.
 */
export interface Emitter {
  /** Human-readable identifier for the AI tool (e.g. `"claude-code"`). */
  name: string;

  /**
   * Returns `true` when the AI tool's config directory is present in the project.
   * @returns `true` if the tool can be detected in the current project.
   */
  detect(): boolean;

  /**
   * Writes the prompt for a phase to the AI tool's expected location.
   * @param phase - The phase whose prompt is being emitted.
   * @param prompt - The rendered prompt text to deliver to the AI tool.
   */
  emitStep(phase: Phase, prompt: string): void;

  /**
   * Removes all files and config blocks written by this emitter.
   * @description Called after the workflow completes (or is restarted) to leave the project clean.
   */
  cleanup(): void;
}

/**
 * Instantiates the correct {@link Emitter} for the given AI tool.
 * @param tool - The AI tool identifier selected by the user.
 * @param projectDir - Absolute path to the project root.
 * @returns The concrete Emitter instance for the specified tool.
 * @throws Error if `tool` does not map to a known Emitter.
 */
export function createEmitter(tool: AiTool, projectDir: string): Emitter {
  const emitters: Record<AiTool, () => Emitter> = {
    "claude-code": () => new ClaudeCodeEmitter(projectDir),
    cursor: () => new CursorEmitter(projectDir),
    copilot: () => new CopilotEmitter(projectDir),
    windsurf: () => new WindsurfEmitter(projectDir),
    aider: () => new AiderEmitter(projectDir),
    trae: () => new TraeEmitter(projectDir),
    other: () => new OtherEmitter(projectDir),
  };
  const factory = emitters[tool];
  if (!factory) throw new Error(`Unknown AI tool: ${tool}`);
  return factory();
}

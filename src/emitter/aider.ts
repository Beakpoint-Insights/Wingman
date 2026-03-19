import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

/**
 * Emitter for Aider.
 * @description Writes each phase prompt to `beakpoint-wingman-prompts/step-{N}.md`.
 * Aider is always considered detectable because it does not require a dedicated config directory.
 */
export class AiderEmitter implements Emitter {
  /** AI tool identifier. */
  name = "aider";
  private projectDir: string;

  /**
   * Creates a new AiderEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Always returns `true` — Aider writes to the prompts directory only, no tool-specific config needed.
   * @returns `true` unconditionally.
   */
  detect(): boolean {
    // Aider is always detectable (writes to prompts only)
    return true;
  }

  /**
   * Writes the prompt to `beakpoint-wingman-prompts/step-{N}.md`.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    // Write to beakpoint-wingman-prompts/step-{n}.md only
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);
  }

  /**
   * Removes all files in the `beakpoint-wingman-prompts` directory.
   */
  cleanup(): void {
    // Remove prompts dir files
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      for (const file of readdirSync(promptsDir)) {
        unlinkSync(join(promptsDir, file));
      }
    }
  }
}

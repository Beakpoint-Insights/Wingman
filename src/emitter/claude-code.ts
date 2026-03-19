import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

/**
 * Emitter for Claude Code.
 * @description Writes each phase prompt as a slash-command file inside `.claude/commands/`
 * so the user can invoke it with `/beakpoint-wingman-step-N` in Claude Code.
 */
export class ClaudeCodeEmitter implements Emitter {
  /** AI tool identifier. */
  name = "claude-code";
  private projectDir: string;

  /**
   * Creates a new ClaudeCodeEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Returns `true` when a `.claude` directory exists in the project root.
   * @returns `true` if Claude Code is detected.
   */
  detect(): boolean {
    return existsSync(join(this.projectDir, ".claude"));
  }

  /**
   * Writes the prompt to `.claude/commands/beakpoint-wingman-step-{N}.md`.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const commandsDir = join(this.projectDir, ".claude", "commands");
    if (!existsSync(commandsDir)) mkdirSync(commandsDir, { recursive: true });
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;
    writeFileSync(join(commandsDir, `beakpoint-wingman-step-${stepNumber}.md`), prompt);
  }

  /**
   * Removes all `beakpoint-wingman*` files from `.claude/commands/`.
   */
  cleanup(): void {
    const commandsDir = join(this.projectDir, ".claude", "commands");
    if (!existsSync(commandsDir)) return;
    for (const file of readdirSync(commandsDir)) {
      if (file.startsWith("beakpoint-wingman")) unlinkSync(join(commandsDir, file));
    }
  }
}

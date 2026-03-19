import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

const PROMPTS_DIR = "beakpoint-wingman-prompts";

/**
 * Generic emitter for unsupported or unknown AI tools.
 * @description Writes the phase prompt to `beakpoint-wingman-prompts/step-{N}.md` and copies it
 * to the system clipboard. The user manually pastes it into their AI tool.
 */
export class OtherEmitter implements Emitter {
  /** AI tool identifier. */
  name = "other";
  private projectDir: string;

  /**
   * Creates a new OtherEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /** Always returns `true` — no specific directory to detect. */
  detect(): boolean {
    return true;
  }

  /**
   * Writes the prompt to a step file and copies it to the clipboard.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    const promptsDir = join(this.projectDir, PROMPTS_DIR);
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);

    // Copy to clipboard
    import("clipboardy")
      .then((clipboardy) => {
        clipboardy.default.writeSync(prompt);
      })
      .catch(() => {
        // Clipboard not available — user can read the file directly
      });
  }

  /** Removes the prompts directory. */
  cleanup(): void {
    const promptsDir = join(this.projectDir, PROMPTS_DIR);
    if (existsSync(promptsDir)) rmSync(promptsDir, { recursive: true });
  }
}

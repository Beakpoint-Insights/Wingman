import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

/**
 * Emitter for Cursor.
 * @description Writes the phase prompt to `beakpoint-wingman-prompts/step-{N}.md` and creates a
 * pointer rule in `.cursor/rules/beakpoint-wingman.mdc` so Cursor picks it up automatically.
 */
export class CursorEmitter implements Emitter {
  /** AI tool identifier. */
  name = "cursor";
  private projectDir: string;

  /**
   * Creates a new CursorEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Returns `true` when a `.cursor` directory exists in the project root.
   * @returns `true` if Cursor is detected.
   */
  detect(): boolean {
    return existsSync(join(this.projectDir, ".cursor"));
  }

  /**
   * Writes the prompt file and updates the Cursor rules pointer.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    // Write to beakpoint-wingman-prompts/step-{n}.md
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);

    // Write rule to .cursor/rules/beakpoint-wingman.mdc
    const rulesDir = join(this.projectDir, ".cursor", "rules");
    if (!existsSync(rulesDir)) mkdirSync(rulesDir, { recursive: true });
    const pointer = `Read and execute the instructions in beakpoint-wingman-prompts/step-${stepNumber}.md`;
    writeFileSync(join(rulesDir, "beakpoint-wingman.mdc"), pointer);
  }

  /**
   * Removes all prompt files and the Cursor rule file written by this emitter.
   */
  cleanup(): void {
    // Remove prompts dir files
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      for (const file of readdirSync(promptsDir)) {
        unlinkSync(join(promptsDir, file));
      }
    }

    // Remove cursor rule file
    const ruleFile = join(this.projectDir, ".cursor", "rules", "beakpoint-wingman.mdc");
    if (existsSync(ruleFile)) unlinkSync(ruleFile);
  }
}

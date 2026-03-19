import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

/**
 * Emitter for Trae.
 * @description Writes each phase prompt to both `beakpoint-wingman-prompts/step-{N}.md` and
 * `.trae/rules/beakpoint-wingman.md` so Trae picks it up as an active rule.
 */
export class TraeEmitter implements Emitter {
  /** AI tool identifier. */
  name = "trae";
  private projectDir: string;

  /**
   * Creates a new TraeEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Returns `true` when a `.trae` directory exists in the project root.
   * @returns `true` if Trae is detected.
   */
  detect(): boolean {
    return existsSync(join(this.projectDir, ".trae"));
  }

  /**
   * Writes the prompt file and the Trae rule file for the current step.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    // Write to beakpoint-wingman-prompts/step-{n}.md
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);

    // Write rule to .trae/rules/beakpoint-wingman.md
    const rulesDir = join(this.projectDir, ".trae", "rules");
    if (!existsSync(rulesDir)) mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "beakpoint-wingman.md"), prompt);
  }

  /**
   * Removes all prompt files and the Trae rule file written by this emitter.
   */
  cleanup(): void {
    // Remove prompts dir files
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      for (const file of readdirSync(promptsDir)) {
        unlinkSync(join(promptsDir, file));
      }
    }

    // Remove trae rule file
    const ruleFile = join(this.projectDir, ".trae", "rules", "beakpoint-wingman.md");
    if (existsSync(ruleFile)) unlinkSync(ruleFile);
  }
}

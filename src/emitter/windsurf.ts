import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { Emitter } from "./emitter.js";
import type { Phase } from "../types.js";
import { PHASES } from "../types.js";

const SENTINEL_START = "# BEAKPOINT WINGMAN START";
const SENTINEL_END = "# BEAKPOINT WINGMAN END";

/**
 * Emitter for Windsurf.
 * @description Writes the phase prompt to `beakpoint-wingman-prompts/step-{N}.md` and inserts a
 * pointer block into `.windsurfrules` between sentinel comments, replacing it on each subsequent step.
 */
export class WindsurfEmitter implements Emitter {
  /** AI tool identifier. */
  name = "windsurf";
  private projectDir: string;

  /**
   * Creates a new WindsurfEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Returns `true` when a `.windsurf` directory exists in the project root.
   * @returns `true` if Windsurf is detected.
   */
  detect(): boolean {
    return existsSync(join(this.projectDir, ".windsurf"));
  }

  /**
   * Writes the prompt file and inserts or updates the Wingman block in `.windsurfrules`.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    // Write to beakpoint-wingman-prompts/step-{n}.md
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);

    // Add pointer in .windsurfrules (not the full prompt)
    const rulesPath = join(this.projectDir, ".windsurfrules");
    const pointer = `${SENTINEL_START}\nRead and execute the instructions in beakpoint-wingman-prompts/step-${stepNumber}.md\n${SENTINEL_END}`;

    if (existsSync(rulesPath)) {
      let content = readFileSync(rulesPath, "utf-8");
      const regex = new RegExp(`${SENTINEL_START}[\\s\\S]*?${SENTINEL_END}`, "g");
      if (regex.test(content)) {
        content = content.replace(regex, pointer);
      } else {
        content += "\n" + pointer + "\n";
      }
      writeFileSync(rulesPath, content);
    } else {
      writeFileSync(rulesPath, pointer + "\n");
    }
  }

  /**
   * Removes all prompt files and the Wingman sentinel block from `.windsurfrules`.
   * Deletes `.windsurfrules` entirely if it would otherwise be empty.
   */
  cleanup(): void {
    // Remove prompts dir
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      for (const file of readdirSync(promptsDir)) {
        unlinkSync(join(promptsDir, file));
      }
    }

    // Remove only Wingman's block from .windsurfrules
    const rulesPath = join(this.projectDir, ".windsurfrules");
    if (existsSync(rulesPath)) {
      let content = readFileSync(rulesPath, "utf-8");
      const regex = new RegExp(`\\n?${SENTINEL_START}[\\s\\S]*?${SENTINEL_END}\\n?`, "g");
      content = content.replace(regex, "");
      if (content.trim() === "") {
        unlinkSync(rulesPath);
      } else {
        writeFileSync(rulesPath, content);
      }
    }
  }
}

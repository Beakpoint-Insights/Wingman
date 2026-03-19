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

const SENTINEL_START = "<!-- BEAKPOINT WINGMAN START -->";
const SENTINEL_END = "<!-- BEAKPOINT WINGMAN END -->";

/**
 * Emitter for GitHub Copilot.
 * @description Writes the phase prompt to `beakpoint-wingman-prompts/step-{N}.md` and inserts a
 * pointer block into `.github/copilot-instructions.md` between sentinel comments so it can be
 * cleanly replaced or removed without affecting existing content.
 */
export class CopilotEmitter implements Emitter {
  /** AI tool identifier. */
  name = "copilot";
  private projectDir: string;

  /**
   * Creates a new CopilotEmitter.
   * @param projectDir - Absolute path to the project root.
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Returns `true` when a `.github` directory exists in the project root.
   * @returns `true` if GitHub Copilot is detected.
   */
  detect(): boolean {
    return existsSync(join(this.projectDir, ".github"));
  }

  /**
   * Writes the prompt file and inserts or updates the Wingman block in `copilot-instructions.md`.
   * @param phase - The phase being emitted.
   * @param prompt - The rendered prompt text.
   */
  emitStep(phase: Phase, prompt: string): void {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;

    // Write to beakpoint-wingman-prompts/step-{n}.md
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (!existsSync(promptsDir)) mkdirSync(promptsDir, { recursive: true });
    writeFileSync(join(promptsDir, `step-${stepNumber}.md`), prompt);

    // Add pointer in .github/copilot-instructions.md (not the full prompt)
    const githubDir = join(this.projectDir, ".github");
    if (!existsSync(githubDir)) mkdirSync(githubDir, { recursive: true });
    const instructionsPath = join(githubDir, "copilot-instructions.md");

    const pointer = `${SENTINEL_START}\nRead and execute the instructions in beakpoint-wingman-prompts/step-${stepNumber}.md\n${SENTINEL_END}`;

    if (existsSync(instructionsPath)) {
      let content = readFileSync(instructionsPath, "utf-8");
      // Replace existing Wingman block or append
      const regex = new RegExp(`${SENTINEL_START}[\\s\\S]*?${SENTINEL_END}`, "g");
      if (regex.test(content)) {
        content = content.replace(regex, pointer);
      } else {
        content += "\n" + pointer + "\n";
      }
      writeFileSync(instructionsPath, content);
    } else {
      writeFileSync(instructionsPath, pointer + "\n");
    }
  }

  /**
   * Removes all prompt files and the Wingman sentinel block from `copilot-instructions.md`.
   * Deletes `copilot-instructions.md` entirely if it would otherwise be empty.
   */
  cleanup(): void {
    // Remove prompts dir
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      for (const file of readdirSync(promptsDir)) {
        unlinkSync(join(promptsDir, file));
      }
    }

    // Remove only Wingman's block from copilot-instructions.md
    const instructionsPath = join(this.projectDir, ".github", "copilot-instructions.md");
    if (existsSync(instructionsPath)) {
      let content = readFileSync(instructionsPath, "utf-8");
      const regex = new RegExp(`\\n?${SENTINEL_START}[\\s\\S]*?${SENTINEL_END}\\n?`, "g");
      content = content.replace(regex, "");
      if (content.trim() === "") {
        unlinkSync(instructionsPath);
      } else {
        writeFileSync(instructionsPath, content);
      }
    }
  }
}

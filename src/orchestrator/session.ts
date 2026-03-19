import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WingmanSession, Phase } from "../types.js";
import { PHASES } from "../types.js";

const PROMPTS_DIR = "beakpoint-wingman-prompts";
const SESSION_FILE = ".wingman-session.json";

/**
 * Creates a new, empty {@link WingmanSession} with all phases set to `pending`.
 * @returns A freshly initialised session with default values.
 */
export function createEmptySession(): WingmanSession {
  const phases: Record<
    string,
    { status: string; promptGenerated: string; userEdits: string[]; corrections: string[] }
  > = {};
  for (const phase of PHASES) {
    phases[phase.id] = {
      status: "pending",
      promptGenerated: "",
      userEdits: [],
      corrections: [],
    };
  }

  return {
    apiKeyEnvVar: "BEAKPOINT_API_KEY",
    aiTool: "",
    deploymentTargets: {},
    projectAnalysis: {
      language: "",
      framework: "",
      entryPoints: [],
      existingOtel: false,
      userHandlesExporter: false,
      configFormat: "",
      userCorrections: [],
    },
    phases: phases as WingmanSession["phases"],
  };
}

/**
 * Persists a session to disk inside the project's prompts directory.
 * @param projectDir - Absolute path to the project root.
 * @param session - The session state to serialise and write.
 */
export function saveSession(projectDir: string, session: WingmanSession): void {
  const dir = join(projectDir, PROMPTS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(join(dir, SESSION_FILE), JSON.stringify(session, null, 2));
}

/**
 * Loads and validates a previously saved session from disk.
 * @param projectDir - Absolute path to the project root.
 * @returns The deserialised {@link WingmanSession}, or `null` if no valid session file exists.
 */
export function loadSession(projectDir: string): WingmanSession | null {
  const filePath = join(projectDir, PROMPTS_DIR, SESSION_FILE);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const session = JSON.parse(raw) as WingmanSession;

    // Validate that the session has all expected phase IDs
    for (const phase of PHASES) {
      if (!session.phases[phase.id]) {
        // Session has stale phase IDs — treat as corrupted
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Finds the first phase that is not yet complete in the session.
 * @param session - The current session state.
 * @returns The next {@link Phase} with status `pending` or `in_progress`, or `null` if all phases are done.
 */
export function getNextPhase(session: WingmanSession): Phase | null {
  for (const phase of PHASES) {
    const state = session.phases[phase.id];
    if (state.status === "pending" || state.status === "in_progress") {
      return phase;
    }
  }
  return null;
}

/**
 * Returns the absolute path to the directory where session files are stored.
 * @param projectDir - Absolute path to the project root.
 * @returns Absolute path to the `beakpoint-wingman-prompts` directory.
 */
export function getSessionDir(projectDir: string): string {
  return join(projectDir, PROMPTS_DIR);
}

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEmptySession,
  saveSession,
  loadSession,
  getNextPhase,
} from "../../../src/orchestrator/session.js";

describe("Session", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "wingman-session-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates an empty session with all phases pending", () => {
    const session = createEmptySession();
    expect(session.phases["project-analysis"].status).toBe("pending");
    expect(session.phases["verification"].status).toBe("pending");
    expect(session.apiKeyEnvVar).toBe("BEAKPOINT_API_KEY");
  });

  it("saves and loads a session to/from disk", () => {
    const session = createEmptySession();
    session.aiTool = "claude-code";
    session.phases["project-analysis"].status = "completed";

    saveSession(testDir, session);
    const loaded = loadSession(testDir);

    expect(loaded).not.toBeNull();
    expect(loaded!.aiTool).toBe("claude-code");
    expect(loaded!.phases["project-analysis"].status).toBe("completed");
  });

  it("returns null when no session file exists", () => {
    const loaded = loadSession(testDir);
    expect(loaded).toBeNull();
  });

  it("returns null for corrupted session file", () => {
    const sessionDir = join(testDir, "beakpoint-wingman-prompts");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, ".wingman-session.json"), "not valid json{{");
    const loaded = loadSession(testDir);
    expect(loaded).toBeNull();
  });

  it("returns the next pending phase", () => {
    const session = createEmptySession();
    session.phases["project-analysis"].status = "completed";
    session.phases["otel-setup"].status = "skipped";

    const next = getNextPhase(session);
    expect(next?.id).toBe("cost-tracking");
  });

  it("returns null when all phases are done", () => {
    const session = createEmptySession();
    for (const phase of Object.values(session.phases)) {
      phase.status = "completed";
    }
    const next = getNextPhase(session);
    expect(next).toBeNull();
  });
});

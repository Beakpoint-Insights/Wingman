import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ClaudeCodeEmitter } from "../../../src/emitter/claude-code.js";

describe("ClaudeCodeEmitter", () => {
  let testDir: string;
  let emitter: ClaudeCodeEmitter;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "wingman-claude-"));
    emitter = new ClaudeCodeEmitter(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("has the correct name", () => {
    expect(emitter.name).toBe("claude-code");
  });

  it("detects when .claude directory exists", () => {
    mkdirSync(join(testDir, ".claude"), { recursive: true });
    expect(emitter.detect()).toBe(true);
  });

  it("returns false when .claude directory is missing", () => {
    expect(emitter.detect()).toBe(false);
  });

  it("writes a slash command file for a phase", () => {
    emitter.emitStep(
      { id: "otel-setup", name: "OTel Setup", description: "" },
      "Add OpenTelemetry to this project",
    );
    const filePath = join(testDir, ".claude", "commands", "beakpoint-wingman-step-2.md");
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Add OpenTelemetry to this project");
  });

  it("cleans up generated files", () => {
    emitter.emitStep({ id: "otel-setup", name: "OTel Setup", description: "" }, "test prompt");
    emitter.cleanup();
    const commandsDir = join(testDir, ".claude", "commands");
    if (existsSync(commandsDir)) {
      const files = readdirSync(commandsDir);
      const wingmanFiles = files.filter((f: string) => f.startsWith("beakpoint-wingman"));
      expect(wingmanFiles.length).toBe(0);
    }
  });
});

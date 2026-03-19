import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { detectAiTool } from "../../../src/detector/detector.js";

describe("detectAiTool", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "wingman-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("detects Claude Code when .claude/ exists", () => {
    mkdirSync(join(testDir, ".claude", "commands"), { recursive: true });
    const result = detectAiTool(testDir, "claude-code");
    expect(result.detected).toBe(true);
  });

  it("detects Cursor when .cursor/ exists", () => {
    mkdirSync(join(testDir, ".cursor"), { recursive: true });
    const result = detectAiTool(testDir, "cursor");
    expect(result.detected).toBe(true);
  });

  it("returns detected=false when directory missing", () => {
    const result = detectAiTool(testDir, "claude-code");
    expect(result.detected).toBe(false);
    expect(result.configDir).toBeDefined();
  });

  it("returns the expected config directory path for each tool", () => {
    const result = detectAiTool(testDir, "copilot");
    expect(result.configDir).toBe(join(testDir, ".github"));
  });
});

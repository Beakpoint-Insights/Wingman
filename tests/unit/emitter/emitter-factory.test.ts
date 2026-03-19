import { describe, it, expect } from "vitest";
import { createEmitter } from "../../../src/emitter/emitter.js";

describe("createEmitter", () => {
  it("creates a claude-code emitter", () => {
    const emitter = createEmitter("claude-code", "/tmp/test");
    expect(emitter.name).toBe("claude-code");
  });

  it("creates emitters for all supported tools", () => {
    const tools = [
      "claude-code",
      "cursor",
      "copilot",
      "windsurf",
      "aider",
      "trae",
      "other",
    ] as const;
    for (const tool of tools) {
      const emitter = createEmitter(tool, "/tmp/test");
      expect(emitter.name).toBe(tool);
    }
  });

  it("throws for unknown tool", () => {
    expect(() => createEmitter("unknown" as any, "/tmp/test")).toThrow();
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BundledTagsProvider } from "../../src/tags/bundled-provider.js";
import { Prompter } from "../../src/prompter/prompter.js";
import { ClaudeCodeEmitter } from "../../src/emitter/claude-code.js";
import { createEmptySession } from "../../src/orchestrator/session.js";
import { PHASES } from "../../src/types.js";

describe("Orchestrator integration", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "wingman-integration-"));
    mkdirSync(join(testDir, ".claude", "commands"), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("generates correct prompt files for a Python/FastAPI + Lambda project", () => {
    const tagsProvider = new BundledTagsProvider();
    const prompter = new Prompter(tagsProvider);
    const emitter = new ClaudeCodeEmitter(testDir);

    const session = createEmptySession();
    session.aiTool = "claude-code";
    session.apiKeyEnvVar = "BEAKPOINT_API_KEY";
    session.deploymentTargets = {
      production: { services: ["aws.lambda"] },
    };
    session.projectAnalysis = {
      language: "python",
      framework: "FastAPI",
      entryPoints: [],
      existingOtel: false,
      userHandlesExporter: false,
      configFormat: "pyproject.toml",
      userCorrections: [],
    };

    // Generate and emit all phases
    for (const phase of PHASES) {
      const prompt = prompter.generate(phase.id, session);
      emitter.emitStep(phase, prompt);
      session.phases[phase.id].status = "completed";
      session.phases[phase.id].promptGenerated = prompt;
    }

    // Verify all step files were created
    for (let i = 1; i <= PHASES.length; i++) {
      const filePath = join(testDir, ".claude", "commands", `beakpoint-wingman-step-${i}.md`);
      expect(existsSync(filePath)).toBe(true);
    }

    // Verify Phase 1 (project-analysis) prompt content
    const step1 = readFileSync(
      join(testDir, ".claude", "commands", "beakpoint-wingman-step-1.md"),
      "utf-8",
    );
    expect(step1).toContain("Analyze");
    expect(step1).toContain("Language and framework");

    // Verify Phase 2 (otel-setup) prompt references Beakpoint endpoint
    const step2 = readFileSync(
      join(testDir, ".claude", "commands", "beakpoint-wingman-step-2.md"),
      "utf-8",
    );
    expect(step2).toContain("otel.beakpoint.io");
    expect(step2).toContain("x-bkpt-key");
    expect(step2).toContain("python");
    expect(step2).toContain("FastAPI");

    // Verify Phase 3 (cost-tracking) prompt includes Lambda attributes
    const step3 = readFileSync(
      join(testDir, ".claude", "commands", "beakpoint-wingman-step-3.md"),
      "utf-8",
    );
    expect(step3).toContain("aws.lambda.memory_size");
    expect(step3).toContain("aws.lambda.architecture");
    expect(step3).toContain("runtime");
    expect(step3).toContain("config"); // should mention config file

    // Verify Phase 4 (cost-attribution) prompt includes user ID tags
    const step4 = readFileSync(
      join(testDir, ".claude", "commands", "beakpoint-wingman-step-4.md"),
      "utf-8",
    );
    expect(step4).toContain("app.user.id");
    expect(step4).toContain("app.user.org.id");

    // Cleanup works
    emitter.cleanup();
    for (let i = 1; i <= PHASES.length; i++) {
      const filePath = join(testDir, ".claude", "commands", `beakpoint-wingman-step-${i}.md`);
      expect(existsSync(filePath)).toBe(false);
    }
  });

  it("generates correct prompt files for a .NET/ASP.NET Core + EC2+RDS project", () => {
    const tagsProvider = new BundledTagsProvider();
    const prompter = new Prompter(tagsProvider);

    const session = createEmptySession();
    session.aiTool = "claude-code";
    session.deploymentTargets = {
      production: { services: ["aws.ec2", "aws.rds"] },
      staging: { services: ["aws.ec2"] },
    };
    session.projectAnalysis = {
      language: "csharp",
      framework: "ASP.NET Core",
      entryPoints: [],
      existingOtel: false,
      userHandlesExporter: false,
      configFormat: "appsettings.json",
      userCorrections: [],
    };

    // Generate cost-tracking prompt (merged config + cost calc)
    const costPrompt = prompter.generate("cost-tracking", session);
    expect(costPrompt).toContain("appsettings.json");
    expect(costPrompt).toContain("host.type"); // static EC2 attr
    expect(costPrompt).toContain("aws.rds.engine"); // static RDS attr
    expect(costPrompt).toContain("host.id"); // runtime EC2 attr
    expect(costPrompt).toContain("instance metadata"); // runtime source
    expect(costPrompt).toContain("cloud.region"); // EC2 uses cloud.region
    expect(costPrompt).toContain("aws.region"); // RDS uses aws.region
    expect(costPrompt).toContain("BaseProcessor"); // .NET implementation hint
  });
});

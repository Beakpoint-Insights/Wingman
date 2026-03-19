import type { Emitter } from "../emitter/emitter.js";
import type { TagsProvider } from "../tags/tags-provider.js";
import type { WingmanSession, AiTool, Phase } from "../types.js";
import { PHASES } from "../types.js";
import { Prompter } from "../prompter/prompter.js";
import {
  createEmptySession,
  saveSession,
  loadSession,
  getNextPhase,
  getSessionDir,
} from "./session.js";
import { createEmitter } from "../emitter/emitter.js";
import { detectAiTool } from "../detector/detector.js";
import {
  askAiTool,
  askApiKeyEnvVar,
  askEnvironments,
  askServicesForEnvironment,
  askPromptAction,
  askCorrection,
  askPhaseResult,
  askResumeOrRestart,
  askPasteResults,
  askConfirm,
  askYesNo,
  askExporterChoice,
} from "../ui/prompts.js";
import {
  displayPhaseHeader,
  displayPromptPreview,
  displayInstruction,
  displaySuccess,
  displayWarning,
} from "../ui/display.js";
import { rmSync, existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Top-level controller for the Beakpoint Wingman guided setup workflow.
 * @description Coordinates session management, prompt generation, AI tool emission, and
 * user interaction across all setup phases. Instantiate once and call {@link Orchestrator.run}.
 */
export class Orchestrator {
  private projectDir: string;
  private tagsProvider: TagsProvider;
  private prompter: Prompter;
  private session!: WingmanSession;
  private emitter!: Emitter;

  /**
   * Creates a new Orchestrator.
   * @param projectDir - Absolute path to the project root where Wingman will operate.
   * @param tagsProvider - Source of service and attribution tag definitions used to generate prompts.
   */
  constructor(projectDir: string, tagsProvider: TagsProvider) {
    this.projectDir = projectDir;
    this.tagsProvider = tagsProvider;
    this.prompter = new Prompter(tagsProvider);
  }

  /**
   * Starts or resumes the guided setup workflow.
   * @description Checks for an existing session and offers to resume it, then iterates through
   * all configured phases, generating and emitting prompts for each one.
   * @returns A promise that resolves when all phases are complete (or the user exits cleanly).
   */
  async run(): Promise<void> {
    // Check for existing session
    const existing = loadSession(this.projectDir);
    if (
      existing === null &&
      existsSync(join(this.projectDir, "beakpoint-wingman-prompts", ".wingman-session.json"))
    ) {
      // File exists but couldn't be parsed — corrupted
      displayWarning("Found a corrupted session file. Starting fresh.");
      const sessionDir = getSessionDir(this.projectDir);
      if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true });
    } else if (existing) {
      const next = getNextPhase(existing);
      if (next) {
        // Incomplete session
        const completedCount = Object.values(existing.phases).filter(
          (p) => p.status === "completed" || p.status === "skipped",
        ).length;
        console.log(`Found existing session: ${completedCount}/${PHASES.length} phases completed.`);
        const choice = await askResumeOrRestart();
        if (choice === "resume") {
          this.session = existing;
          this.emitter = createEmitter(existing.aiTool as AiTool, this.projectDir);
          await this.runPhases();
          return;
        }
      } else {
        // All phases completed
        displaySuccess("All phases were already completed in a previous session.");
        const choice = await askResumeOrRestart();
        if (choice === "resume") {
          // Nothing to resume — clean up
          this.emitter = createEmitter(existing.aiTool as AiTool, this.projectDir);
          this.emitter.cleanup();
          displaySuccess("Cleaned up Wingman artifacts.");
          return;
        }
      }
      // Start over — clean up
      const sessionDir = getSessionDir(this.projectDir);
      if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true });
    }

    // Phase 0: Setup
    this.session = createEmptySession();
    await this.runPhase0();
    saveSession(this.projectDir, this.session);

    // Run remaining phases
    await this.runPhases();
  }

  private async runPhase0(): Promise<void> {
    console.log("\n═══ Beakpoint Wingman ═══\n");
    console.log(
      "Wingman will walk you through integrating your project with Beakpoint for cloud cost tracking.\n",
    );
    console.log("Here's what we'll do together:\n");
    console.log("  1. Analyze your project — your AI tool will examine the codebase");
    console.log(
      "  2. Set up OpenTelemetry — add tracing if needed, configure the Beakpoint exporter",
    );
    console.log("  3. Cost tracking — create config and code to set cost calculation attributes");
    console.log(
      "  4. Cost attribution — wire up user identity, service name, and other business context",
    );
    console.log("  5. Verify — review everything end-to-end\n");
    console.log("At each step, you'll review the prompt before it's sent to your AI tool,");
    console.log("and you can correct the AI's work before moving on.\n");
    console.log("Let's get started!\n");

    // Ask AI tool
    const aiTool = await askAiTool();
    this.session.aiTool = aiTool;
    this.emitter = createEmitter(aiTool, this.projectDir);

    // Validate AI tool directory
    const detection = detectAiTool(this.projectDir, aiTool);
    if (!detection.detected) {
      displayWarning(`No ${aiTool} config directory found at ${detection.configDir}`);
      displayInstruction("It will be created when the first prompt is emitted.");
    }

    // Ask API key env var
    this.session.apiKeyEnvVar = await askApiKeyEnvVar();

    // Ask environments
    const environments = await askEnvironments();

    // Ask services per environment
    for (const env of environments) {
      const services = await askServicesForEnvironment(env);
      if (services.length === 0) {
        displayWarning(
          "No services selected for " +
            env +
            ". Use Space to toggle selections, then Enter to confirm.\n" +
            "  Skipping this environment.",
        );
        continue;
      }
      if (services.includes("other")) {
        displayWarning(
          "Cost calculation isn't supported yet for your deployment target, but that's okay!\n" +
            "  We can still configure sending traces to Beakpoint and set up cost attribution\n" +
            "  tags (user ID, org ID, service name, etc.) so you're ready when support is added.",
        );
      }
      this.session.deploymentTargets[env] = { services };
    }

    // Add beakpoint-wingman-prompts/ to .gitignore if not already there
    this.ensureGitignore();
  }

  private ensureGitignore(): void {
    const gitignorePath = join(this.projectDir, ".gitignore");
    const entry = "beakpoint-wingman-prompts/";
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, "utf-8");
      if (!content.includes(entry)) {
        appendFileSync(gitignorePath, `\n# Beakpoint Wingman temporary files\n${entry}\n`);
      }
    } else {
      appendFileSync(gitignorePath, `# Beakpoint Wingman temporary files\n${entry}\n`);
    }
  }

  private async runPhases(): Promise<void> {
    for (const phase of PHASES) {
      const state = this.session.phases[phase.id];
      if (state.status === "completed" || state.status === "skipped") {
        continue;
      }

      // Check skip condition
      if (phase.skipCondition?.(this.session)) {
        displayWarning(`Skipping "${phase.name}" — condition met.`);
        const action = await askPromptAction();
        if (action === "skip") {
          state.status = "skipped";
          saveSession(this.projectDir, this.session);
          continue;
        }
      }

      await this.runPhase(phase);
    }

    displaySuccess("All phases complete! Cleaning up Wingman artifacts...");
    this.emitter.cleanup();

    // Clean up the prompts directory (emitters may leave it behind)
    const promptsDir = join(this.projectDir, "beakpoint-wingman-prompts");
    if (existsSync(promptsDir)) {
      rmSync(promptsDir, { recursive: true });
    }

    console.log("\n═══ What's Next ═══\n");
    console.log("Before you ship, two important things:\n");
    console.log("  1. Review the code changes yourself. AI-generated code can contain");
    console.log("     mistakes — check that the attributes are correct, secrets aren't");
    console.log("     hardcoded, and the integration fits your project's patterns.\n");
    console.log("  2. Run the changes through your AI tool's code review. For example:");
    console.log("     - Claude Code: /review");
    console.log("     - Cursor: use the built-in review features");
    console.log("     - GitHub Copilot: open a PR and let Copilot review it\n");
    console.log("Once you're happy with the changes, deploy and check your Beakpoint");
    console.log("dashboard — traces may take up to 30 minutes to appear.\n");
    console.log("Happy cost tracking!\n");
  }

  private async runPhase(phase: Phase): Promise<void> {
    const stepNumber = PHASES.findIndex((p) => p.id === phase.id) + 1;
    displayPhaseHeader(phase.name, stepNumber);

    // Generate prompt
    let prompt = this.prompter.generate(phase.id, this.session);
    this.session.phases[phase.id].status = "in_progress";
    this.session.phases[phase.id].promptGenerated = prompt;
    saveSession(this.projectDir, this.session);

    // Prompt review loop
    let approved = false;
    while (!approved) {
      displayPromptPreview(prompt);
      const action = await askPromptAction();

      if (action === "skip") {
        this.session.phases[phase.id].status = "skipped";
        saveSession(this.projectDir, this.session);
        return;
      }

      if (action === "edit") {
        const correction = await askCorrection();
        this.session.phases[phase.id].userEdits.push(correction);
        this.session.projectAnalysis.userCorrections.push(correction);
        prompt = this.prompter.generate(phase.id, this.session);
        this.session.phases[phase.id].promptGenerated = prompt;
        saveSession(this.projectDir, this.session);
        continue;
      }

      approved = true;
    }

    // Emit to AI tool
    this.emitter.emitStep(phase, prompt);
    displayInstruction(this.getInstructionForTool(phase, stepNumber));

    // Phase 1 (project-analysis) has a special flow: paste results back
    if (phase.id === "project-analysis") {
      await this.handleProjectAnalysisResults();
      return;
    }

    // Wait for user to execute and review
    let phaseComplete = false;
    while (!phaseComplete) {
      await askPasteResults();
      displaySuccess("Got it. Reviewing...\n");

      const result = await askPhaseResult();

      if (result === "done") {
        this.session.phases[phase.id].status = "completed";
        saveSession(this.projectDir, this.session);
        displaySuccess(`Phase ${stepNumber}: ${phase.name} — completed.`);
        phaseComplete = true;
      } else {
        const correction = await askCorrection();
        this.session.phases[phase.id].corrections.push(correction);

        // Generate follow-up prompt with correction
        const followUp = this.prompter.generate(phase.id, this.session);
        this.emitter.emitStep(phase, followUp);
        saveSession(this.projectDir, this.session);
        displayInstruction(
          "Correction prompt emitted. " + this.getInstructionForTool(phase, stepNumber),
        );
      }
    }
  }

  private async handleProjectAnalysisResults(): Promise<void> {
    const aiOutput = await askPasteResults();

    if (aiOutput.trim().length === 0) {
      displayWarning("No output captured. Please fill in the fields manually.");
    } else {
      displaySuccess(
        `Got it (captured ${aiOutput.length} characters). Let's confirm what the AI found:\n`,
      );
    }

    // Ask user to confirm/correct each field, with guesses pre-filled
    const guessedLang = this.guessFromOutput(aiOutput, [
      "Python",
      "python",
      "C#",
      "csharp",
      ".NET",
      "TypeScript",
      "typescript",
      "JavaScript",
      "javascript",
      "Ruby",
      "ruby",
      "Go",
      "go",
      "Java",
      "java",
      "Rust",
      "rust",
    ]);
    const language = await askConfirm("Language:", guessedLang || "");

    const guessedFramework = this.guessFromOutput(aiOutput, [
      "FastAPI",
      "fastapi",
      "Django",
      "django",
      "Flask",
      "flask",
      "ASP.NET Core",
      "asp.net core",
      "Express",
      "express",
      "Fastify",
      "fastify",
      "NestJS",
      "nestjs",
      "Rails",
      "rails",
      "Spring Boot",
      "spring boot",
      "Gin",
      "gin",
      "Echo",
      "echo",
      "Actix",
      "actix",
    ]);
    const framework = await askConfirm("Framework:", guessedFramework || "");

    const otelGuess = this.guessOtelPresence(aiOutput);
    if (otelGuess) {
      displaySuccess(
        "It looks like OpenTelemetry is already set up. We'll skip the OTel installation step and focus on Beakpoint-specific configuration.",
      );
    } else {
      displayInstruction(
        "It looks like OpenTelemetry needs to be set up. We'll walk you through adding it.",
      );
    }
    const guessCorrect = await askYesNo("Is that correct?", true);
    const existingOtel = guessCorrect ? otelGuess : !otelGuess;

    // If OTel is already set up, ask about exporter configuration
    let userHandlesExporter = false;
    if (existingOtel) {
      displayInstruction(
        "Since OpenTelemetry is already configured, you have two options for sending traces to Beakpoint:",
      );
      const exporterChoice = await askExporterChoice();
      userHandlesExporter = exporterChoice === "user";
      if (userHandlesExporter) {
        displaySuccess(
          "Got it — we'll skip exporter configuration and focus on cost calculation and attribution tags.",
        );
      }
    }

    const guessedConfig = this.guessFromOutput(aiOutput, [
      "appsettings.json",
      "pyproject.toml",
      ".env",
      "package.json",
      "config.yaml",
      "config.yml",
      "settings.py",
      "application.properties",
    ]);
    const configFormat = await askConfirm("Config file format:", guessedConfig || "");

    this.session.projectAnalysis = {
      language,
      framework,
      entryPoints: [],
      existingOtel,
      userHandlesExporter,
      configFormat,
      userCorrections: this.session.projectAnalysis.userCorrections,
    };

    this.session.phases["project-analysis"].status = "completed";
    saveSession(this.projectDir, this.session);
    displaySuccess("Phase 1: Project Analysis — confirmed and saved.");
  }

  private guessOtelPresence(output: string): boolean {
    const lower = output.toLowerCase();
    // Strong positive signals
    const positiveSignals = [
      "already configured",
      "already set up",
      "already installed",
      "fully configured",
      "otel packages installed",
      "opentelemetry is",
      "tracing is configured",
      "otlp export",
      "opentelemetry.exporter",
      "opentelemetry.instrumentation",
      "opentelemetry.sdk",
      "opentelemetry.api",
      "addopentelemetry",
      "useopentelemetry",
      "x-ray",
      "xray",
      "jaeger",
      "zipkin",
    ];
    // Strong negative signals
    const negativeSignals = [
      "no opentelemetry",
      "no otel",
      "not installed",
      "not configured",
      "no tracing",
      "no distributed tracing",
      "no existing",
    ];

    for (const neg of negativeSignals) {
      if (lower.includes(neg)) return false;
    }
    for (const pos of positiveSignals) {
      if (lower.includes(pos)) return true;
    }

    // Check if "3." section contains YES
    const section3Match = output.match(/3\.\s*\*?\*?Existing.*?\n\s*(YES|NO)/i);
    if (section3Match) {
      return section3Match[1].toUpperCase() === "YES";
    }

    return false;
  }

  private guessFromOutput(output: string, candidates: string[]): string | null {
    const lower = output.toLowerCase();
    for (const candidate of candidates) {
      if (lower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return null;
  }

  private getInstructionForTool(_phase: Phase, stepNumber: number): string {
    const pasteBack =
      "\nOnce your AI tool finishes, copy its output to your clipboard and come back here.";

    switch (this.session.aiTool) {
      case "claude-code":
        return `Run /beakpoint-wingman-step-${stepNumber} in Claude Code.${pasteBack}`;
      case "cursor":
        return `Open Cursor — the rule is active. Or paste from clipboard.${pasteBack}`;
      case "copilot":
        return `Prompt copied to clipboard. Paste it into Copilot Chat.${pasteBack}`;
      case "aider":
        return `Run /read beakpoint-wingman-prompts/step-${stepNumber}.md in Aider, or paste from clipboard.${pasteBack}`;
      case "windsurf":
        return `Open Windsurf — the rule is active. Or paste from clipboard.${pasteBack}`;
      case "trae":
        return `Open Trae — the rule is active. Or paste from clipboard.${pasteBack}`;
      case "other":
        return `The prompt has been copied to your clipboard. Paste it into your AI tool.${pasteBack}`;
      default:
        return `The prompt has been copied to your clipboard. Paste it into your AI tool.${pasteBack}`;
    }
  }
}

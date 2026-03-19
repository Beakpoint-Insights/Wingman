import Handlebars from "handlebars";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TagsProvider } from "../tags/tags-provider.js";
import type { WingmanSession, PhaseId } from "../types.js";
import { PHASES } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

/**
 * Generates Handlebars-rendered prompts for each guided setup phase.
 * @description Combines phase templates with session state and tags data to produce
 * the prompt text that is forwarded to the user's AI coding tool.
 */
export class Prompter {
  private tagsProvider: TagsProvider;
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  /**
   * Creates a new Prompter instance.
   * @param tagsProvider - Source of service and attribution tag definitions used to populate templates.
   */
  constructor(tagsProvider: TagsProvider) {
    this.tagsProvider = tagsProvider;
    this.registerPartials();
  }

  private registerPartials(): void {
    const constraintsPath = join(TEMPLATES_DIR, "common", "constraints.md");
    Handlebars.registerPartial("constraints", readFileSync(constraintsPath, "utf-8"));
  }

  private loadTemplate(phaseId: PhaseId): HandlebarsTemplateDelegate {
    const cached = this.templateCache.get(phaseId);
    if (cached) return cached;

    const templateMap: Record<PhaseId, string> = {
      "project-analysis": "project-analysis.md",
      "otel-setup": "otel-setup.md",
      "cost-tracking": "cost-tracking.md",
      "cost-attribution": "cost-attribution.md",
      verification: "verification.md",
    };

    const filePath = join(TEMPLATES_DIR, "phases", templateMap[phaseId]);
    const source = readFileSync(filePath, "utf-8");
    const template = Handlebars.compile(source);
    this.templateCache.set(phaseId, template);
    return template;
  }

  /**
   * Renders the prompt for a specific phase using the current session state.
   * @param phaseId - The ID of the phase to generate a prompt for.
   * @param session - The current {@link WingmanSession} providing context variables.
   * @returns The fully rendered prompt string ready to be sent to an AI tool.
   */
  generate(phaseId: PhaseId, session: WingmanSession): string {
    const headerPath = join(TEMPLATES_DIR, "common", "context-header.md");
    const headerSource = readFileSync(headerPath, "utf-8");
    const headerTemplate = Handlebars.compile(headerSource);

    const template = this.loadTemplate(phaseId);

    const completedPhases = PHASES.filter(
      (p) =>
        session.phases[p.id].status === "completed" || session.phases[p.id].status === "skipped",
    );

    const allServices = Object.values(session.deploymentTargets).flatMap((t) => t.services);
    const uniqueServices = [...new Set(allServices)];
    const knownServices = uniqueServices.filter((s) => s !== "other");
    const hasOtherServices = uniqueServices.includes("other");

    const variables = {
      language: session.projectAnalysis.language || "unknown",
      framework: session.projectAnalysis.framework || "unknown",
      existingOtel: session.projectAnalysis.existingOtel,
      configFormat: session.projectAnalysis.configFormat || "unknown",
      apiKeyEnvVar: session.apiKeyEnvVar,
      services: uniqueServices.join(", "),
      hasOtherServices,
      deploymentTargets: this.formatDeploymentTargets(session),
      serviceTags: this.formatServiceTags(knownServices),
      staticAttributes: this.formatStaticAttributes(knownServices),
      runtimeAttributes: this.formatRuntimeAttributes(knownServices),
      attributionTags: this.formatAttributionTags(),
      completedPhases: completedPhases.map((p) => p.name).join(", "),
      corrections: [
        ...session.projectAnalysis.userCorrections,
        ...Object.values(session.phases).flatMap((p) => p.corrections),
      ],
      hasCompletedPhases: completedPhases.length > 0,
      hasCorrections:
        session.projectAnalysis.userCorrections.length > 0 ||
        Object.values(session.phases).some((p) => p.corrections.length > 0),
    };

    let prompt = headerTemplate(variables) + "\n\n";
    prompt += template(variables);

    if (variables.hasCompletedPhases) {
      prompt += "\n\n**Phases already completed:** " + variables.completedPhases;
    }

    if (variables.hasCorrections) {
      prompt +=
        "\n\n**User corrections from prior steps:**\n" +
        variables.corrections.map((c: string) => `- ${c}`).join("\n");
    }

    return prompt;
  }

  private formatDeploymentTargets(session: WingmanSession): string {
    const lines: string[] = [];
    for (const [env, config] of Object.entries(session.deploymentTargets)) {
      lines.push(`- **${env}**: ${config.services.join(", ")}`);
    }
    return lines.join("\n") || "No deployment targets configured yet.";
  }

  private formatServiceTags(serviceIds: string[]): string {
    const lines: string[] = [];
    for (const id of serviceIds) {
      try {
        const service = this.tagsProvider.getCostCalculationService(id);
        lines.push(`\n### ${service.displayName} (\`${id}\`)`);
        lines.push(`Match strategy: ${service.matchStrategy}`);

        if (service.discriminators) {
          lines.push(
            `Discriminators: ${Object.entries(service.discriminators)
              .map(([k, v]) => `\`${k}\` = \`${v}\``)
              .join(", ")}`,
          );
        }

        lines.push("\n**Required attributes:**");
        for (const [key, attr] of Object.entries(service.required)) {
          let line = `- \`${key}\` — ${attr.description} [${attr.resolution}]`;
          if (attr.runtimeSource) line += ` (source: ${attr.runtimeSource})`;
          if (attr.allowedValues) line += ` (values: ${attr.allowedValues.join(", ")})`;
          if (attr.default) line += ` (default: ${attr.default})`;
          lines.push(line);
        }

        if (Object.keys(service.optional).length > 0) {
          lines.push("\n**Optional attributes:**");
          for (const [key, attr] of Object.entries(service.optional)) {
            let line = `- \`${key}\` — ${attr.description} [${attr.resolution}]`;
            if (attr.default) line += ` (default: ${attr.default})`;
            lines.push(line);
          }
        }
      } catch {
        lines.push(`\n### Unknown service: ${id}`);
      }
    }
    return lines.join("\n");
  }

  private formatStaticAttributes(serviceIds: string[]): string {
    const lines: string[] = [];
    for (const id of serviceIds) {
      const statics = this.tagsProvider.getStaticAttributes(id);
      if (Object.keys(statics).length === 0) continue;
      lines.push(`\n**${id}:**`);
      for (const [key, attr] of Object.entries(statics)) {
        let line = `- \`${key}\` — ${attr.description}`;
        if (attr.example) line += ` (example: \`${attr.example}\`)`;
        if (attr.allowedValues) line += ` (values: ${attr.allowedValues.join(", ")})`;
        if (attr.default) line += ` (default: \`${attr.default}\`)`;
        lines.push(line);
      }
    }
    return lines.join("\n") || "No static attributes for selected services.";
  }

  private formatRuntimeAttributes(serviceIds: string[]): string {
    const lines: string[] = [];
    for (const id of serviceIds) {
      const runtimes = this.tagsProvider.getRuntimeAttributes(id);
      if (Object.keys(runtimes).length === 0) continue;
      lines.push(`\n**${id}:**`);
      for (const [key, attr] of Object.entries(runtimes)) {
        let line = `- \`${key}\` — ${attr.description}`;
        if (attr.runtimeSource) line += ` (source: ${attr.runtimeSource})`;
        lines.push(line);
      }
    }
    return lines.join("\n") || "No runtime attributes for selected services.";
  }

  private formatAttributionTags(): string {
    const tags = this.tagsProvider.getCostAttributionTags();
    return tags
      .map((t) => {
        let line = `- \`${t.key}\` — ${t.description} [${t.resolution}]`;
        if (t.example) line += ` (example: \`${t.example}\`)`;
        return line;
      })
      .join("\n");
  }
}

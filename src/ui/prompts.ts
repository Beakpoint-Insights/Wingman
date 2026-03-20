import { select, input, checkbox } from "@inquirer/prompts";
import type { AiTool } from "../types.js";

const AI_TOOL_CHOICES: Array<{ name: string; value: AiTool }> = [
  { name: "Claude Code", value: "claude-code" },
  { name: "Cursor", value: "cursor" },
  { name: "GitHub Copilot", value: "copilot" },
  { name: "Windsurf", value: "windsurf" },
  { name: "Aider", value: "aider" },
  { name: "Trae", value: "trae" },
  { name: "Other", value: "other" },
];

const SERVICE_CHOICES = [
  { name: "AWS EC2", value: "aws.ec2" },
  { name: "AWS Lambda", value: "aws.lambda" },
  { name: "AWS RDS", value: "aws.rds" },
  { name: "AWS Fargate", value: "aws.fargate" },
  { name: "Azure VM", value: "azure.vm" },
  { name: "Azure App Service Plan", value: "azure.asp" },
  { name: "Hetzner Cloud", value: "hetzner.cloud" },
  { name: "Hetzner Dedicated", value: "hetzner.dedicated" },
  { name: "Heroku Dyno", value: "heroku.dyno" },
  { name: "Other", value: "other" },
];

/**
 * Asks the user to select their AI coding tool.
 * @returns The selected {@link AiTool} identifier.
 */
export async function askAiTool(): Promise<AiTool> {
  return select({
    message: "Which AI coding tool are you using?",
    choices: AI_TOOL_CHOICES,
  });
}

/**
 * Asks the user to confirm or enter the environment variable name for their Beakpoint API key.
 * @returns The environment variable name string (defaults to `"BEAKPOINT_API_KEY"`).
 */
export async function askApiKeyEnvVar(): Promise<string> {
  return input({
    message: "Beakpoint API key environment variable name:",
    default: "BEAKPOINT_API_KEY",
  });
}

/**
 * Asks the user to provide a comma-separated list of deployment environments.
 * @returns Array of trimmed environment name strings.
 */
export async function askEnvironments(): Promise<string[]> {
  const envs = await input({
    message: "What environments do you deploy to? (comma-separated)",
    default: "production, staging",
  });
  return envs
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Asks the user to select the cloud services their app uses in a specific environment.
 * @param environment - The deployment environment being configured (shown in the prompt).
 * @returns Array of selected service identifier strings.
 */
export async function askServicesForEnvironment(environment: string): Promise<string[]> {
  return checkbox({
    message: `Which cloud services does this app run on in ${environment}? (Space to select, Enter to confirm)`,
    choices: SERVICE_CHOICES,
  });
}

/**
 * Asks the user what action to take after reviewing a generated prompt.
 * @returns `"approve"` to send the prompt, `"edit"` to add a correction, or `"skip"` to skip the phase.
 */
export async function askPromptAction(): Promise<"approve" | "edit" | "skip"> {
  return select({
    message: "What would you like to do?",
    choices: [
      { name: "Approve and send to AI tool", value: "approve" as const },
      { name: "Edit / provide correction", value: "edit" as const },
      { name: "Skip this phase", value: "skip" as const },
    ],
  });
}

/**
 * Asks the user to type a free-text correction to be applied to the current phase.
 * @returns The correction string entered by the user.
 */
export async function askCorrection(): Promise<string> {
  return input({
    message: "Enter your correction:",
  });
}

/**
 * Waits for the user to copy the AI tool's output to their clipboard, then reads it.
 * @returns The clipboard contents, or an empty string if reading fails.
 */
export async function askPasteResults(): Promise<string> {
  const clipboardy = await import("clipboardy");

  await input({
    message: "Copy the AI tool's output to your clipboard, then press Enter.",
  });

  try {
    return await clipboardy.default.read();
  } catch {
    return "";
  }
}

/**
 * Asks the user to confirm or update a single text value.
 * @param message - The prompt label to display.
 * @param defaultValue - Pre-filled value the user can accept or overwrite.
 * @returns The confirmed or updated string value.
 */
export async function askConfirm(message: string, defaultValue: string): Promise<string> {
  return input({
    message,
    default: defaultValue,
  });
}

/**
 * Asks the user a yes/no question.
 * @param message - The question to display.
 * @param defaultValue - Whether `Yes` is pre-selected (defaults to `true`).
 * @returns `true` if the user selects Yes, `false` otherwise.
 */
export async function askYesNo(message: string, defaultValue: boolean = true): Promise<boolean> {
  return select({
    message,
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: defaultValue,
  });
}

/**
 * Asks the user whether the AI tool's output looks good or needs a correction.
 * @returns `"done"` to advance to the next phase, or `"correction"` to provide feedback.
 */
export async function askPhaseResult(): Promise<"done" | "correction"> {
  return select({
    message: "How did it go?",
    choices: [
      { name: "Looks good — move to next phase", value: "done" as const },
      { name: "Needs correction", value: "correction" as const },
    ],
  });
}

/**
 * Asks the user how they want to send traces to Beakpoint when OTel is already configured.
 * @returns `"user"` if they will configure the exporter themselves, or `"wingman"` to have Wingman add it.
 */
export async function askExporterChoice(): Promise<"user" | "wingman"> {
  return select({
    message: "How would you like to send traces to Beakpoint?",
    choices: [
      {
        name: "I'll configure my OTel Collector to forward traces to Beakpoint myself",
        value: "user" as const,
      },
      {
        name: "Have Wingman add a Beakpoint exporter directly in my application code",
        value: "wingman" as const,
      },
    ],
  });
}

/**
 * Asks the user whether to resume an existing session or start over.
 * @returns `"resume"` to continue from where the session left off, or `"restart"` to begin fresh.
 */
export async function askResumeOrRestart(): Promise<"resume" | "restart"> {
  return select({
    message: "Found an existing session. What would you like to do?",
    choices: [
      { name: "Resume where you left off", value: "resume" as const },
      { name: "Start over", value: "restart" as const },
    ],
  });
}

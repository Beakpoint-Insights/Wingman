/**
 * Describes a single attribute on a cost-calculation span tag.
 * @description Metadata for a named attribute, including how it is resolved and any constraints.
 */
export interface TagAttribute {
  /** Human-readable description of the attribute. */
  description: string;
  /** Whether the value is known at config time (`static`) or at request time (`runtime`). */
  resolution: "static" | "runtime";
  /** Optional illustrative value. */
  example?: string;
  /** Allowed enumerated values, if restricted. */
  allowedValues?: string[];
  /** Default value to use when none is supplied. */
  default?: string;
  /** Hardcoded value, when the attribute has a fixed value. */
  value?: string;
  /** Describes where the runtime value originates (e.g. a request header or SDK call). */
  runtimeSource?: string;
}

/**
 * Describes an AI/cloud service whose cost can be tracked with Beakpoint.
 * @description Defines how spans for a specific service are matched and which attributes are required or optional.
 */
export interface ServiceDefinition {
  /** Display name shown in the Beakpoint UI. */
  displayName: string;
  /** Strategy used to identify this service on a span. */
  matchStrategy: "discriminator" | "presence";
  /** Key/value pairs that must be present on the span to identify this service. */
  discriminators?: Record<string, string>;
  /** Attributes that must be set on every span for this service. */
  required: Record<string, TagAttribute>;
  /** Attributes that may optionally be set on spans for this service. */
  optional: Record<string, TagAttribute>;
}

/**
 * A single cost-attribution tag definition.
 * @description Represents a business-context attribute (e.g. user ID or org ID) that can be added to spans.
 */
export interface AttributionTag {
  /** Category grouping for the tag. */
  category: string;
  /** Human-readable description of the tag. */
  description: string;
  /** Whether the value is known at config time or at request time. */
  resolution: "static" | "runtime";
  /** Optional illustrative value. */
  example?: string;
}

/**
 * Root structure of the bundled tags JSON file.
 * @description Contains the schema version plus all service and attribution tag definitions.
 */
export interface TagsData {
  /** Schema version string for the tags data file. */
  version: string;
  /** Cost-calculation service definitions keyed by service ID. */
  costCalculation: Record<string, ServiceDefinition>;
  /** Cost-attribution tag definitions keyed by tag key. */
  costAttribution: Record<string, AttributionTag>;
}

/**
 * Identifies each guided setup phase by its string ID.
 * @description Union of all valid phase identifiers used throughout the session lifecycle.
 */
export type PhaseId =
  | "project-analysis"
  | "otel-setup"
  | "cost-tracking"
  | "cost-attribution"
  | "verification";

/**
 * Lifecycle status of a single phase.
 * @description Tracks where each phase is in the guided workflow.
 */
export type PhaseStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * Runtime state for a single guided phase.
 * @description Persisted to the session file so the workflow can be resumed after interruption.
 */
export interface PhaseState {
  /** Current lifecycle status of the phase. */
  status: PhaseStatus;
  /** The prompt text that was generated and sent to the AI tool. */
  promptGenerated: string;
  /** Free-text edits the user requested before approving the prompt. */
  userEdits: string[];
  /** Corrections the user supplied after reviewing the AI tool's output. */
  corrections: string[];
}

/**
 * Analysis results produced by the project-analysis phase.
 * @description Captures what the AI tool discovered about the target codebase.
 */
export interface ProjectAnalysis {
  /** Primary programming language detected (e.g. `"TypeScript"`). */
  language: string;
  /** Web framework detected (e.g. `"Express"`). */
  framework: string;
  /** Relative paths to application entry-point files. */
  entryPoints: string[];
  /** Whether OpenTelemetry is already configured in the project. */
  existingOtel: boolean;
  /** Whether the user will configure their own OTel exporter rather than having Wingman add one. */
  userHandlesExporter: boolean;
  /** Config file format in use (e.g. `"package.json"`, `"appsettings.json"`). */
  configFormat: string;
  /** Free-text corrections the user provided during the project-analysis phase. */
  userCorrections: string[];
}

/**
 * The full persisted state for a Wingman setup session.
 * @description Written to disk after each phase so the workflow can be resumed.
 */
export interface WingmanSession {
  /** Name of the environment variable that holds the Beakpoint API key. */
  apiKeyEnvVar: string;
  /** The AI tool the user has selected (e.g. `"claude-code"`). */
  aiTool: string;
  /** Deployment environments and the cloud services running in each. */
  deploymentTargets: Record<string, { services: string[] }>;
  /** Results of the project-analysis phase. */
  projectAnalysis: ProjectAnalysis;
  /** Per-phase runtime state, keyed by {@link PhaseId}. */
  phases: Record<PhaseId, PhaseState>;
}

/**
 * Supported AI coding tools that Wingman can emit prompts for.
 * @description Used to select the correct {@link Emitter} implementation.
 */
export type AiTool = "claude-code" | "cursor" | "copilot" | "windsurf" | "aider" | "trae" | "other";

/**
 * Static metadata describing a single guided setup phase.
 * @description Used to drive the phase-iteration loop in the Orchestrator.
 */
export interface Phase {
  /** Unique identifier for the phase. */
  id: PhaseId;
  /** Short human-readable label shown in the terminal. */
  name: string;
  /** One-line description of what the phase accomplishes. */
  description: string;
  /**
   * Optional predicate that, when it returns `true`, causes the phase to be offered for skipping.
   * @param session - The current session state.
   * @returns `true` if the skip condition is met.
   */
  skipCondition?: (session: WingmanSession) => boolean;
}

/**
 * Ordered list of all guided setup phases.
 * @description The Orchestrator iterates over this array to drive the workflow from start to finish.
 */
export const PHASES: Phase[] = [
  {
    id: "project-analysis",
    name: "Project Analysis",
    description: "Analyze the codebase to identify language, framework, and existing OTel setup",
  },
  {
    id: "otel-setup",
    name: "OpenTelemetry SDK Setup",
    description: "Add OpenTelemetry packages and initialization",
    skipCondition: (session) =>
      session.projectAnalysis.existingOtel && session.projectAnalysis.userHandlesExporter,
  },
  {
    id: "cost-tracking",
    name: "Cost Tracking Setup",
    description: "Create Beakpoint config and add code to set cost calculation attributes on spans",
  },
  {
    id: "cost-attribution",
    name: "Cost Attribution Attributes",
    description: "Wire up user identity and service attributes",
  },
  {
    id: "verification",
    name: "Verification",
    description: "Review integration end-to-end and generate test commands",
  },
];

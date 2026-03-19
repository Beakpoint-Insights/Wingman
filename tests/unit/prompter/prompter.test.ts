import { describe, it, expect } from "vitest";
import { Prompter } from "../../../src/prompter/prompter.js";
import { BundledTagsProvider } from "../../../src/tags/bundled-provider.js";
import { createEmptySession } from "../../../src/orchestrator/session.js";

describe("Prompter", () => {
  const tagsProvider = new BundledTagsProvider();
  const prompter = new Prompter(tagsProvider);

  it("generates a project-analysis prompt with context header", () => {
    const session = createEmptySession();
    const prompt = prompter.generate("project-analysis", session);
    expect(prompt).toContain("Beakpoint");
    expect(prompt).toContain("cloud cost analysis");
    expect(prompt).toContain("Analyze");
  });

  it("generates an otel-setup prompt referencing the endpoint", () => {
    const session = createEmptySession();
    session.projectAnalysis.language = "python";
    session.projectAnalysis.framework = "FastAPI";
    const prompt = prompter.generate("otel-setup", session);
    expect(prompt).toContain("otel.beakpoint.io");
    expect(prompt).toContain("x-bkpt-key");
    expect(prompt).toContain("python");
  });

  it("generates a cost-tracking prompt with both static and runtime attributes", () => {
    const session = createEmptySession();
    session.projectAnalysis.language = "csharp";
    session.projectAnalysis.configFormat = "appsettings.json";
    session.deploymentTargets = { production: { services: ["aws.ec2"] } };
    const prompt = prompter.generate("cost-tracking", session);
    // Static attributes
    expect(prompt).toContain("host.type");
    expect(prompt).toContain("cloud.region");
    expect(prompt).toContain("appsettings.json");
    // Runtime attributes
    expect(prompt).toContain("host.id");
    expect(prompt).toContain("instance metadata");
    // Implementation guidance
    expect(prompt).toContain("BaseProcessor");
  });

  it("generates a cost-attribution prompt with user identity tags", () => {
    const session = createEmptySession();
    const prompt = prompter.generate("cost-attribution", session);
    expect(prompt).toContain("app.user.id");
    expect(prompt).toContain("app.user.org.id");
    expect(prompt).toContain("service.name");
  });

  it("includes completed phases in the prompt", () => {
    const session = createEmptySession();
    session.phases["project-analysis"].status = "completed";
    session.phases["otel-setup"].status = "completed";
    const prompt = prompter.generate("cost-tracking", session);
    expect(prompt).toContain("already completed");
  });

  it("includes user corrections in the prompt", () => {
    const session = createEmptySession();
    session.projectAnalysis.userCorrections = ["Actually I use Django, not Flask"];
    const prompt = prompter.generate("otel-setup", session);
    expect(prompt).toContain("Django, not Flask");
  });

  it("generates a verification prompt", () => {
    const session = createEmptySession();
    const prompt = prompter.generate("verification", session);
    expect(prompt).toContain("review");
    expect(prompt).toContain("verify");
  });
});

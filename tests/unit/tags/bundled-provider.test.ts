import { describe, it, expect } from "vitest";
import { BundledTagsProvider } from "../../../src/tags/bundled-provider.js";

describe("BundledTagsProvider", () => {
  const provider = new BundledTagsProvider();

  it("returns a version string", () => {
    expect(provider.getVersion()).toBe("1.0");
  });

  it("returns all cost calculation services", () => {
    const services = provider.getCostCalculationServices();
    expect(services.length).toBeGreaterThan(0);
    const ids = services.map((s) => s.id);
    expect(ids).toContain("aws.ec2");
    expect(ids).toContain("aws.lambda");
    expect(ids).toContain("aws.rds");
    expect(ids).toContain("aws.fargate");
    expect(ids).toContain("azure.vm");
    expect(ids).toContain("azure.asp");
    expect(ids).toContain("hetzner.cloud");
    expect(ids).toContain("hetzner.dedicated");
  });

  it("returns a specific service by ID", () => {
    const ec2 = provider.getCostCalculationService("aws.ec2");
    expect(ec2.displayName).toBe("AWS EC2");
    expect(ec2.matchStrategy).toBe("discriminator");
    expect(ec2.required["cloud.platform"].value).toBe("aws_ec2");
    expect(ec2.required["host.id"].resolution).toBe("runtime");
    expect(ec2.required["host.type"].resolution).toBe("static");
  });

  it("throws for unknown service ID", () => {
    expect(() => provider.getCostCalculationService("aws.nonexistent")).toThrow();
  });

  it("returns cost attribution tags", () => {
    const tags = provider.getCostAttributionTags();
    const keys = tags.map((t) => t.key);
    expect(keys).toContain("app.user.id");
    expect(keys).toContain("app.user.org.id");
    expect(keys).toContain("service.name");
    expect(keys).toContain("service.namespace");
    expect(keys).toContain("cloud.platform");
  });

  it("distinguishes static and runtime attributes for Lambda", () => {
    const lambda = provider.getCostCalculationService("aws.lambda");
    expect(lambda.required["aws.lambda.architecture"].resolution).toBe("static");
    expect(lambda.required["aws.lambda.memory_size"].resolution).toBe("runtime");
    expect(lambda.required["aws.lambda.arn"].resolution).toBe("runtime");
  });

  it("returns static-only attributes for a service", () => {
    const statics = provider.getStaticAttributes("aws.ec2");
    expect(statics).toHaveProperty("host.type");
    expect(statics).toHaveProperty("cloud.region");
    expect(statics).not.toHaveProperty("host.id");
  });

  it("returns runtime-only attributes for a service", () => {
    const runtimes = provider.getRuntimeAttributes("aws.ec2");
    expect(runtimes).toHaveProperty("host.id");
    expect(runtimes).not.toHaveProperty("host.type");
  });
});

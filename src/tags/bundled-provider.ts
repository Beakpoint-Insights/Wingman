import type { TagsProvider } from "./tags-provider.js";
import type { TagsData, ServiceDefinition, AttributionTag, TagAttribute } from "../types.js";
import tagsData from "./tags.json" with { type: "json" };

/**
 * Tags provider backed by the JSON file bundled with the Wingman package.
 * @description Implements {@link TagsProvider} using the static `tags.json` that ships with
 * Wingman so no network request is required at runtime.
 */
export class BundledTagsProvider implements TagsProvider {
  private data: TagsData = tagsData as TagsData;

  /**
   * Returns the schema version of the bundled tags file.
   * @returns Version string from `tags.json`.
   */
  getVersion(): string {
    return this.data.version;
  }

  /**
   * Returns all cost-calculation services defined in the bundled tags.
   * @returns Array of service definitions each augmented with an `id` field.
   */
  getCostCalculationServices(): Array<{ id: string } & ServiceDefinition> {
    return Object.entries(this.data.costCalculation).map(([id, def]) => ({
      id,
      ...def,
    }));
  }

  /**
   * Returns the definition for a specific cost-calculation service.
   * @param serviceId - The service identifier (e.g. `"aws.lambda"`).
   * @returns The {@link ServiceDefinition} for the requested service.
   * @throws Error if `serviceId` is not present in the bundled tags.
   */
  getCostCalculationService(serviceId: string): ServiceDefinition {
    const service = this.data.costCalculation[serviceId];
    if (!service) {
      throw new Error(`Unknown service: ${serviceId}`);
    }
    return service;
  }

  /**
   * Returns all cost-attribution tags defined in the bundled tags.
   * @returns Array of attribution tags each augmented with a `key` field.
   */
  getCostAttributionTags(): Array<{ key: string } & AttributionTag> {
    return Object.entries(this.data.costAttribution).map(([key, def]) => ({
      key,
      ...def,
    }));
  }

  /**
   * Returns the statically-resolved attributes for a service.
   * @param serviceId - The service identifier.
   * @returns Map of attribute name to {@link TagAttribute} for `resolution === "static"` entries.
   */
  getStaticAttributes(serviceId: string): Record<string, TagAttribute> {
    const service = this.getCostCalculationService(serviceId);
    const result: Record<string, TagAttribute> = {};
    for (const [key, attr] of Object.entries({ ...service.required, ...service.optional })) {
      if (attr.resolution === "static") {
        result[key] = attr;
      }
    }
    return result;
  }

  /**
   * Returns the runtime-resolved attributes for a service.
   * @param serviceId - The service identifier.
   * @returns Map of attribute name to {@link TagAttribute} for `resolution === "runtime"` entries.
   */
  getRuntimeAttributes(serviceId: string): Record<string, TagAttribute> {
    const service = this.getCostCalculationService(serviceId);
    const result: Record<string, TagAttribute> = {};
    for (const [key, attr] of Object.entries({ ...service.required, ...service.optional })) {
      if (attr.resolution === "runtime") {
        result[key] = attr;
      }
    }
    return result;
  }
}

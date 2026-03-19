import type { ServiceDefinition, AttributionTag, TagAttribute } from "../types.js";

/**
 * Provides access to the Beakpoint tags schema.
 * @description Abstracts over the source of tag data (bundled JSON, remote API, etc.) so consumers
 * remain decoupled from the underlying storage mechanism.
 */
export interface TagsProvider {
  /**
   * Returns the schema version string of the tags data.
   * @returns Semantic version string, e.g. `"1.0.0"`.
   */
  getVersion(): string;

  /**
   * Returns all known cost-calculation services with their IDs.
   * @returns Array of service definitions each augmented with a string `id` field.
   */
  getCostCalculationServices(): Array<{ id: string } & ServiceDefinition>;

  /**
   * Returns the definition for a specific cost-calculation service.
   * @param serviceId - The service identifier (e.g. `"aws.lambda"`).
   * @returns The {@link ServiceDefinition} for the requested service.
   * @throws Error if the service ID is not recognised.
   */
  getCostCalculationService(serviceId: string): ServiceDefinition;

  /**
   * Returns all cost-attribution tags with their keys.
   * @returns Array of attribution tags each augmented with a string `key` field.
   */
  getCostAttributionTags(): Array<{ key: string } & AttributionTag>;

  /**
   * Returns only the statically-resolved attributes for a service.
   * @param serviceId - The service identifier.
   * @returns A map of attribute name to {@link TagAttribute} for attributes with `resolution === "static"`.
   */
  getStaticAttributes(serviceId: string): Record<string, TagAttribute>;

  /**
   * Returns only the runtime-resolved attributes for a service.
   * @param serviceId - The service identifier.
   * @returns A map of attribute name to {@link TagAttribute} for attributes with `resolution === "runtime"`.
   */
  getRuntimeAttributes(serviceId: string): Record<string, TagAttribute>;
}

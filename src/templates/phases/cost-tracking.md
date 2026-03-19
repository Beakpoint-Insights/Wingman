Set up cost tracking for Beakpoint. This involves two things: creating a config file with static attribute values, and writing code to set these attributes on OpenTelemetry spans.

## Part 1: Create a Beakpoint config file

Use the project's native config format ({{{configFormat}}}).

**What to include in the config:**
- API key as environment variable reference (`{{{apiKeyEnvVar}}}`) — never hardcode the actual key
- Beakpoint endpoint: `https://otel.beakpoint.io/api/traces`
- Service metadata: name, namespace, version

**Deployment targets:**
{{{deploymentTargets}}}

{{#if serviceTags}}
## Part 2: Set cost calculation attributes on spans

Because you chose the deployment targets above, here are the cost calculation attributes that Beakpoint needs to calculate infrastructure costs:

{{{serviceTags}}}

**Static attributes** (put these values in the config file):
{{{staticAttributes}}}

**Runtime attributes** (resolve these in code — do NOT hardcode):
{{{runtimeAttributes}}}

**Implementation pattern:**
- For .NET: Use a custom `BaseProcessor<Activity>` with an `OnStart()` override, or middleware that runs on every request
- For Python: Use a custom `SpanProcessor` or middleware
- Read static values from the Beakpoint config file you just created
- Resolve runtime values from the environment/metadata sources listed above
{{/if}}

{{#if hasOtherServices}}
**Note:** Some deployment targets don't have cost calculation support yet. For those, skip the cost calculation attributes — we'll set up cost attribution tags in the next step.
{{/if}}

{{> constraints}}

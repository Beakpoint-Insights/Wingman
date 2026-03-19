{{#if existingOtel}}
This project already has OpenTelemetry installed. We just need to add a Beakpoint exporter alongside the existing tracing configuration.

**Add a Beakpoint OTLP exporter** with these settings:
- Endpoint: `https://otel.beakpoint.io/api/traces`
- Protocol: HTTP/Protobuf
- API key header: `x-bkpt-key` — read from the `{{{apiKeyEnvVar}}}` environment variable
- Only traces are supported (no metrics or logs)

Add this as an additional exporter — do NOT remove or replace any existing exporters or tracing configuration.
{{else}}
Add OpenTelemetry tracing to this project:

1. **Install packages** — Add the appropriate OpenTelemetry SDK packages for {{{language}}}/{{{framework}}}.
2. **Initialize tracing** — Wire up the OpenTelemetry SDK in the application startup/initialization code.
3. **Auto-instrumentation** — Add auto-instrumentation for HTTP requests, database calls, and any other supported libraries.
4. **Configure exporter** — Set up the OTLP exporter with these settings:
   - Endpoint: `https://otel.beakpoint.io/api/traces`
   - Protocol: HTTP/Protobuf
   - API key header: `x-bkpt-key` — read from the `{{{apiKeyEnvVar}}}` environment variable
   - Only traces are supported (no metrics or logs)
{{/if}}

{{> constraints}}

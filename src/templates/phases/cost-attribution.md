Add cost attribution attributes to OpenTelemetry spans. These provide business context for why costs were incurred.

**Attributes to set:**

{{{attributionTags}}}

**Key implementation notes:**
- `app.user.id` and `app.user.org.id` must be extracted from the authenticated user's identity in the request pipeline. Look at where auth middleware or JWT decoding makes the user available.
- `service.name`, `service.namespace`, `service.version` — the OTel SDK usually sets `service.name` automatically from the assembly/package name, and it can be overridden via the `OTEL_SERVICE_NAME` env var. Verify these are set correctly; only add explicit code if they're missing or wrong. `service.namespace` is less commonly auto-detected and may need to be set via `OTEL_RESOURCE_ATTRIBUTES` or in code.
- `deployment.environment.name` should come from an environment variable or the deployment config (e.g., `ASPNETCORE_ENVIRONMENT` in .NET, `APP_ENV` in Python).
- `cloud.provider` and `cloud.region` — these may already be set by OTel resource detectors (e.g., the AWS or Azure resource detector). Check if they're present before adding them manually.
- `code.function.name` is set automatically by some OTel auto-instrumentation libraries. If not, set it where appropriate.

{{> constraints}}

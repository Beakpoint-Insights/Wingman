Please review and verify the Beakpoint integration end-to-end:

1. **Exporter configuration** — Is the OTLP exporter pointing to `https://otel.beakpoint.io/api/traces` with the `x-bkpt-key` header?
2. **API key security** — Is the API key read from an environment variable, never hardcoded?
3. **Required attributes** — For each configured cloud service, are all required cost calculation attributes being set?
4. **Attribution attributes** — Are `app.user.id`, `app.user.org.id`, `service.name`, and `service.namespace` being set on spans?
5. **Config completeness** — Does the config file have correct values for all static attributes?

**Generate a test command** — Provide a curl command, test script, or instructions to send a test trace to Beakpoint and verify it appears in the dashboard.

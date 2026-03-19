Analyze this codebase and report the following:

1. **Language and framework** — What language is this project written in? What web framework does it use?
2. **Application entry points** — Where is the main application initialized? Where are HTTP routes defined?
3. **Existing OpenTelemetry setup** — This is critical: does this project already have OpenTelemetry, or a compatible distributed tracing system (e.g., AWS X-Ray, Jaeger, Zipkin), set up? Start your answer with **"YES"** or **"NO"**, then explain. Check for: OTel SDK packages in dependency files, tracing initialization code, any existing OTLP exporter configuration, or auto-instrumentation agents.
4. **User identity** — Where in the request pipeline is the authenticated user's identity available? (auth middleware, JWT decoding, session lookup, etc.)
5. **Config file patterns** — What configuration format does this project use? (appsettings.json, pyproject.toml, .env, etc.)

Please respond with a structured summary. Be specific about file paths and line numbers.

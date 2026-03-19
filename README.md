# Beakpoint Wingman

[![Tests](https://github.com/Beakpoint-Insights/Wingman/actions/workflows/test.yml/badge.svg)](https://github.com/Beakpoint-Insights/Wingman/actions/workflows/test.yml)

AI-assisted integration tool that helps you connect your backend codebase with [Beakpoint](https://beakpointinsights.com) for cloud cost analysis.

Wingman generates targeted prompts for your existing AI coding assistant (Claude Code, Cursor, Copilot, Windsurf, Aider, Trae) that guide it through adding OpenTelemetry tracing and Beakpoint cost tracking to your project.

## Quick Start

```bash
npx @beakpoint/wingman
```

Wingman will:
1. Ask which AI tool you're using and what cloud services you deploy to
2. Generate a prompt for your AI tool to analyze your codebase
3. Walk you through adding OpenTelemetry, configuring the Beakpoint exporter, and setting cost tracking attributes
4. Let you review and correct each step before and after your AI tool executes it

## Supported AI Tools

- Claude Code
- Cursor
- GitHub Copilot
- Windsurf
- Aider
- Trae

## Supported Languages

- Python (FastAPI, Django, Flask, etc.)
- .NET (ASP.NET Core)
- Node.js (Express, Fastify, etc.)

## Development

```bash
npm install
npm test
npm run dev
```

## License

MIT

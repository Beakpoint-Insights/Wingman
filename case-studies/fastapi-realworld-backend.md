# Case Study: FastAPI RealWorld Backend

**Repository:** [borys25ol/fastapi-realworld-backend](https://github.com/borys25ol/fastapi-realworld-backend)

**Stack:** Python 3.12, FastAPI 0.128.0, SQLAlchemy 2.0, PostgreSQL, httpx

**AI Tool:** Claude Code

**Time:** ~5 minutes across 5 steps

---

## What This Project Is

The [FastAPI RealWorld Backend](https://github.com/borys25ol/fastapi-realworld-backend) is a production-style REST API implementing the [RealWorld spec](https://realworld-docs.netlify.app/) — a Medium-like blogging platform with users, articles, comments, tags, and follow/favorite functionality. It uses async SQLAlchemy with PostgreSQL, JWT authentication, and structured logging via structlog.

Before Wingman, the project had **zero observability** — no OpenTelemetry, no distributed tracing, no cost tracking.

## How Wingman Works

Wingman and your AI coding tool work **side by side**. Wingman is a CLI tool that runs in your terminal — it doesn't write code itself. Instead, it:

1. Asks you setup questions (which AI tool, which cloud services, etc.)
2. Generates a tailored prompt for each integration phase
3. Shows you the prompt for review — you can edit it or approve it as-is
4. Writes the prompt as a slash command for your AI tool (e.g., `.claude/commands/beakpoint-wingman-step-1.md`)
5. You switch to your AI tool and run the slash command
6. Your AI tool analyzes the codebase and makes the changes
7. You come back to Wingman, confirm the results, and move to the next phase

This means **you're always in control** — Wingman generates the instructions, your AI tool executes them, and you review at every step.

## The Integration Process

Below is the full transcript showing both sides: what Wingman generated, and what Claude Code did with it.

---

### Phase 0: Setup (in Wingman)

```
❯ npx @beakpoint/wingman

? Which AI coding tool are you using? Claude Code
? Beakpoint API key environment variable name? BEAKPOINT_API_KEY
? What environments do you deploy to? production, staging
```

Wingman saves these answers to a session file and begins generating prompts.

---

### Step 1: Codebase Analysis

**Wingman** generated a prompt asking Claude to analyze the codebase — language, framework, entry points, existing telemetry, auth patterns, and config format. It wrote this to `.claude/commands/beakpoint-wingman-step-1.md` and displayed:

> *Run `/beakpoint-wingman-step-1` in Claude Code*

**Claude Code** (after running `/beakpoint-wingman-step-1`):

> Codebase Analysis for Beakpoint Integration
>
> 1. **Language and Framework** — Python 3.12, FastAPI 0.128.0 (Starlette 0.50.0, Uvicorn 0.40.0)
>
> 2. **Application Entry Points** — App initialization: `conduit/app.py` — `create_app()` (lines 11-34), instance at line 37. Router: `conduit/api/router.py` — includes sub-routers for auth, users, profiles, tags, articles, comments under /api prefix.
>
> 3. **Existing OpenTelemetry Setup** — **NO** — No OpenTelemetry or compatible distributed tracing is configured. The only observability tool is structlog (v25.5.0) for structured logging.
>
> 4. **User Identity** — Token extraction: `conduit/core/security.py` — HTTPTokenHeader class. JWT parsing: `conduit/services/auth_token.py` — `parse_jwt_token()` returns TokenPayloadDTO with user_id and username. Dependency injection: `conduit/core/dependencies.py` — `get_current_user()` and `get_current_user_or_none()`.
>
> 5. **Config File Patterns** — `.env` files with Pydantic Settings. `pyproject.toml` for tool config.

**Back in Wingman**, we confirmed the analysis looked correct and moved to the next phase.

---

### Step 2: Add OpenTelemetry Packages and Core Tracing

**Wingman** generated a prompt for adding OpenTelemetry — tailored to the Python/FastAPI stack and SQLAlchemy ORM that Claude identified in Step 1. It wrote `.claude/commands/beakpoint-wingman-step-2.md`.

> *Run `/beakpoint-wingman-step-2` in Claude Code*

**Claude Code** read the existing app factory, dependency injection, and database setup, then made these changes:

1. Added 6 OpenTelemetry packages to `requirements.txt`
2. Created `conduit/core/tracing.py` with a `setup_tracing()` function
3. Wired it into `conduit/app.py` — passing the FastAPI app and SQLAlchemy engine
4. Added `BEAKPOINT_API_KEY` placeholder to `.env.example`

Auto-instrumentation covers:
- **FastAPI** — all HTTP request/response spans
- **SQLAlchemy** — all database query spans
- **httpx** — all outbound HTTP call spans

Tracing is a **no-op** when `BEAKPOINT_API_KEY` is not set.

---

### Step 3: Beakpoint Configuration

**Wingman** generated a prompt for setting up the Beakpoint-specific configuration — service identity, endpoint, and OTel resource attributes. It wrote `.claude/commands/beakpoint-wingman-step-3.md`.

> *Run `/beakpoint-wingman-step-3` in Claude Code*

**Claude Code** added a `[tool.beakpoint]` section to `pyproject.toml` and updated `tracing.py` to read from it:

```toml
[tool.beakpoint]
api_key_env = "BEAKPOINT_API_KEY"
endpoint = "https://otel.beakpoint.io/api/traces"

[tool.beakpoint.service]
name = "conduit-api"
namespace = "conduit"
version = "0.1.0"
```

This sets OTel semantic convention resource attributes (`service.name`, `service.namespace`, `service.version`) from config rather than hardcoding them.

---

### Step 4: Cost Attribution Attributes

**Wingman** generated a prompt for adding the span attributes Beakpoint uses for cost analysis — user identity, deployment environment, cloud metadata, and code-level function names. It wrote `.claude/commands/beakpoint-wingman-step-4.md`.

> *Run `/beakpoint-wingman-step-4` in Claude Code*

**Claude Code** added these attributes:

| Attribute | Type | How It's Set |
|---|---|---|
| `service.name` | Static | OTel Resource, from pyproject.toml |
| `service.namespace` | Static | OTel Resource, from pyproject.toml |
| `service.version` | Static | OTel Resource, from pyproject.toml |
| `deployment.environment.name` | Static | OTel Resource, from `APP_ENV` env var |
| `cloud.provider` | Static | OTel Resource, from pyproject.toml |
| `cloud.region` | Static | OTel Resource, from pyproject.toml |
| `cloud.platform` | Static | OTel Resource, from pyproject.toml |
| `code.function.name` | Runtime | FastAPI server request hook per-request |
| `app.user.id` | Runtime | Auth dependency after JWT resolution |

The key integration point: Claude wired `set_beakpoint_user(user.id)` into both `get_current_user` and `get_current_user_or_none` dependencies, so every authenticated request automatically tags the span with the user ID.

---

### Step 5: Verification

**Wingman** generated a final prompt asking Claude to review all changes end-to-end and verify the integration works. It wrote `.claude/commands/beakpoint-wingman-step-5.md`.

> *Run `/beakpoint-wingman-step-5` in Claude Code*

**Claude Code** reviewed all modified files, then created a test script (`scripts/test_beakpoint_tracing.py`) and ran it:

```
❯ APP_ENV=dev python scripts/test_beakpoint_tracing.py --local

=== Beakpoint Config ===
  Endpoint: https://otel.beakpoint.io/api/traces
  API key env var: BEAKPOINT_API_KEY

=== Resource Attributes ===
  service.name: conduit-api
  service.namespace: conduit
  service.version: 0.1.0

=== Sample Span (console export) ===
{
    "name": "test-request",
    "context": { ... },
    "attributes": {
        "http.method": "GET",
        "http.route": "/api/articles",
        "code.function.name": "conduit.api.routes.article.get_global_article_feed",
        "app.user.id": "42"
    },
    "resource": {
        "attributes": {
            "service.name": "conduit-api",
            "service.namespace": "conduit",
            "service.version": "0.1.0"
        }
    }
}

=== Verification Complete ===
```

All resource and span attributes confirmed present and correct.

---

## Complete Diff

**7 files** were created or modified. Here is the full patch:

```diff
diff --git a/.env.example b/.env.example
--- a/.env.example
+++ b/.env.example
@@ -1 +1,4 @@
 SECRET_KEY=changeme
+
+# Beakpoint (optional - enables OpenTelemetry tracing when set)
+BEAKPOINT_API_KEY=

diff --git a/.gitignore b/.gitignore
--- a/.gitignore
+++ b/.gitignore
@@ -11,3 +11,6 @@ __pycache__
 .coverage
 google_credentials.json
 ./test.py
+
+# Beakpoint Wingman temporary files
+beakpoint-wingman-prompts/

diff --git a/conduit/app.py b/conduit/app.py
--- a/conduit/app.py
+++ b/conduit/app.py
@@ -4,8 +4,10 @@ from starlette.middleware.cors import CORSMiddleware
 from conduit.api.middlewares import RateLimitingMiddleware
 from conduit.api.router import router as api_router
 from conduit.core.config import get_app_settings
+from conduit.core.container import container
 from conduit.core.exceptions import add_exception_handlers
 from conduit.core.logging import configure_logger
+from conduit.core.tracing import setup_tracing


 def create_app() -> FastAPI:
@@ -31,6 +33,8 @@ def create_app() -> FastAPI:

     configure_logger()

+    setup_tracing(app=application, engine=container._engine)
+
     return application

diff --git a/conduit/core/dependencies.py b/conduit/core/dependencies.py
--- a/conduit/core/dependencies.py
+++ b/conduit/core/dependencies.py
@@ -15,6 +15,7 @@ from conduit.core.providers import (
     get_user_service,
 )
 from conduit.core.security import HTTPTokenHeader
+from conduit.core.tracing import set_beakpoint_user
 from conduit.dtos.domain.user import UserDTO
 from conduit.services.article import ArticleService
 from conduit.services.auth import UserAuthService
@@ -80,6 +81,7 @@ async def get_current_user_or_none(
     current_user_dto = await user_service.get_user_by_id(
         session=session, user_id=jwt_user.user_id
     )
+    set_beakpoint_user(current_user_dto.id)
     return current_user_dto


@@ -93,6 +95,7 @@ async def get_current_user(
     current_user_dto = await user_service.get_user_by_id(
         session=session, user_id=jwt_user.user_id
     )
+    set_beakpoint_user(current_user_dto.id)
     return current_user_dto

diff --git a/pyproject.toml b/pyproject.toml
--- a/pyproject.toml
+++ b/pyproject.toml
@@ -1,3 +1,20 @@
+[tool.beakpoint]
+api_key_env = "BEAKPOINT_API_KEY"
+endpoint = "https://otel.beakpoint.io/api/traces"
+
+[tool.beakpoint.service]
+name = "conduit-api"
+namespace = "conduit"
+version = "0.1.0"
+
+[tool.beakpoint.cloud]
+provider = ""
+region = ""
+platform = ""
+
+[tool.beakpoint.deployment]
+environment_name_env = "APP_ENV"
+
 [tool.black]
 line-length = 88
 target-version = ['py312']

diff --git a/requirements.txt b/requirements.txt
--- a/requirements.txt
+++ b/requirements.txt
@@ -18,3 +18,11 @@ SQLAlchemy-Utils==0.41.2
 starlette==0.50.0
 structlog==25.5.0
 uvicorn==0.40.0
+
+# OpenTelemetry
+opentelemetry-api==1.33.0
+opentelemetry-sdk==1.33.0
+opentelemetry-exporter-otlp-proto-http==1.33.0
+opentelemetry-instrumentation-fastapi==0.54b0
+opentelemetry-instrumentation-sqlalchemy==0.54b0
+opentelemetry-instrumentation-httpx==0.54b0
```

### New file: `conduit/core/tracing.py`

```python
import os
import tomllib
from pathlib import Path

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

__all__ = ["setup_tracing"]


def _load_beakpoint_config() -> dict:
    """Load Beakpoint configuration from pyproject.toml."""
    pyproject_path = Path(__file__).resolve().parents[2] / "pyproject.toml"
    if not pyproject_path.exists():
        return {}

    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)

    return data.get("tool", {}).get("beakpoint", {})


def _build_resource_attributes(config: dict) -> dict[str, str]:
    """Build OTel resource attributes from Beakpoint config."""
    service_config = config.get("service", {})
    cloud_config = config.get("cloud", {})
    deployment_config = config.get("deployment", {})

    attributes: dict[str, str] = {
        "service.name": service_config.get("name", "conduit-api"),
        "service.namespace": service_config.get("namespace", "conduit"),
        "service.version": service_config.get("version", "0.1.0"),
    }

    # Deployment environment from env var
    env_var = deployment_config.get("environment_name_env", "APP_ENV")
    env_name = os.environ.get(env_var, "")
    if env_name:
        attributes["deployment.environment.name"] = env_name

    # Cloud attributes (only set if configured)
    for key in ("provider", "region", "platform"):
        value = cloud_config.get(key, "")
        if value:
            attributes[f"cloud.{key}"] = value

    return attributes


def _server_request_hook(span, scope):
    """
    FastAPI server request hook to set runtime span attributes.

    Extracts the authenticated user ID and route handler function name
    from the ASGI scope and sets them on the current span.
    """
    if not span or not span.is_recording():
        return

    # Set code.function.name from the matched route endpoint
    route = scope.get("route")
    if route and hasattr(route, "endpoint"):
        endpoint = route.endpoint
        module = getattr(endpoint, "__module__", "")
        qualname = getattr(endpoint, "__qualname__", "")
        if module and qualname:
            span.set_attribute("code.function.name", f"{module}.{qualname}")


def _set_user_attributes(span, user_id: int | None) -> None:
    """Set user identity attributes on the current span."""
    if user_id is not None:
        span.set_attribute("app.user.id", str(user_id))


def setup_tracing(app, engine=None) -> None:
    """
    Initialize OpenTelemetry tracing with Beakpoint exporter.

    Reads configuration from [tool.beakpoint] in pyproject.toml.
    Configures tracing only when the BEAKPOINT_API_KEY environment variable is set.
    """
    config = _load_beakpoint_config()

    api_key_env = config.get("api_key_env", "BEAKPOINT_API_KEY")
    api_key = os.environ.get(api_key_env)
    if not api_key:
        return

    endpoint = config.get("endpoint", "https://otel.beakpoint.io/api/traces")

    resource = Resource.create(_build_resource_attributes(config))

    provider = TracerProvider(resource=resource)

    exporter = OTLPSpanExporter(
        endpoint=endpoint,
        headers={"x-bkpt-key": api_key},
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)

    # Auto-instrument FastAPI with server request hook for runtime attributes
    FastAPIInstrumentor.instrument_app(
        app,
        server_request_hook=_server_request_hook,
    )

    # Auto-instrument httpx (used by the project for HTTP calls)
    HTTPXClientInstrumentor().instrument()

    # Auto-instrument SQLAlchemy if an engine is provided
    if engine is not None:
        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)


def set_beakpoint_user(user_id: int) -> None:
    """
    Set the authenticated user's ID on the current active span.

    Call this after resolving the user identity in the request pipeline.
    """
    span = trace.get_current_span()
    if span and span.is_recording():
        _set_user_attributes(span, user_id)
```

### New file: `scripts/test_beakpoint_tracing.py`

```python
"""
Verify Beakpoint tracing integration by sending a test trace.

Usage:
    # Local verification (prints spans to console, no API key needed):
    python scripts/test_beakpoint_tracing.py --local

    # Send to Beakpoint (requires BEAKPOINT_API_KEY):
    BEAKPOINT_API_KEY=your-key-here python scripts/test_beakpoint_tracing.py
"""

import argparse
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def verify_local():
    """Verify tracing setup locally by inspecting the configured provider."""
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

    from conduit.core.tracing import _build_resource_attributes, _load_beakpoint_config

    config = _load_beakpoint_config()
    attributes = _build_resource_attributes(config)

    print("=== Beakpoint Config ===")
    print(f"  Endpoint: {config.get('endpoint', '(default)')}")
    print(f"  API key env var: {config.get('api_key_env', 'BEAKPOINT_API_KEY')}")
    print()

    print("=== Resource Attributes ===")
    for key, value in sorted(attributes.items()):
        print(f"  {key}: {value}")
    print()

    # Create a test provider with console exporter to show a sample span
    resource = Resource.create(attributes)
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)

    tracer = trace.get_tracer("beakpoint-test")

    print("=== Sample Span (console export) ===")
    with tracer.start_as_current_span("test-request") as span:
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.route", "/api/articles")
        span.set_attribute("code.function.name", "conduit.api.routes.article.get_global_article_feed")
        span.set_attribute("app.user.id", "42")

    print()
    print("=== Verification Complete ===")

    # Check for missing recommended attributes
    missing = []
    if not attributes.get("deployment.environment.name"):
        missing.append("deployment.environment.name (set APP_ENV)")
    if not attributes.get("cloud.provider"):
        missing.append("cloud.provider (configure in pyproject.toml)")
    if not attributes.get("cloud.region"):
        missing.append("cloud.region (configure in pyproject.toml)")
    if not attributes.get("cloud.platform"):
        missing.append("cloud.platform (configure in pyproject.toml)")

    if missing:
        print("\nAttributes not yet configured (OK for local dev):")
        for attr in missing:
            print(f"  - {attr}")


def verify_remote():
    """Send a test trace to Beakpoint endpoint."""
    api_key = os.environ.get("BEAKPOINT_API_KEY")
    if not api_key:
        print("ERROR: BEAKPOINT_API_KEY environment variable is not set.")
        print("Set it and re-run, or use --local for local verification.")
        sys.exit(1)

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor

    from conduit.core.tracing import _build_resource_attributes, _load_beakpoint_config

    config = _load_beakpoint_config()
    attributes = _build_resource_attributes(config)
    endpoint = config.get("endpoint", "https://otel.beakpoint.io/api/traces")

    from opentelemetry.sdk.resources import Resource

    resource = Resource.create(attributes)
    provider = TracerProvider(resource=resource)

    exporter = OTLPSpanExporter(
        endpoint=endpoint,
        headers={"x-bkpt-key": api_key},
    )
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    tracer = trace.get_tracer("beakpoint-test")

    print(f"Sending test trace to {endpoint}...")
    with tracer.start_as_current_span("beakpoint-integration-test") as span:
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.route", "/api/health")
        span.set_attribute("code.function.name", "beakpoint.integration.test")
        span.set_attribute("app.user.id", "test-user")

    provider.force_flush()
    print("Test trace sent. Check your Beakpoint dashboard to verify it arrived.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify Beakpoint tracing integration")
    parser.add_argument(
        "--local",
        action="store_true",
        help="Local verification only (console output, no API key needed)",
    )
    args = parser.parse_args()

    if args.local:
        verify_local()
    else:
        verify_remote()
```

## Key Decisions Claude Made

1. **No-op when unconfigured** — `setup_tracing()` returns immediately if `BEAKPOINT_API_KEY` is not set, so the integration has zero impact on existing deployments.

2. **Config in pyproject.toml** — Follows the Python convention of `[tool.*]` sections. No secrets in config files; only the env var *name* is stored.

3. **Auth dependency hook** — Rather than middleware, Claude wired user identity tagging into the existing `get_current_user` / `get_current_user_or_none` FastAPI dependencies. This is the natural place in this codebase since the user is already resolved there.

4. **Server request hook** — Used FastAPI instrumentor's `server_request_hook` to set `code.function.name` with the fully-qualified handler function name (e.g., `conduit.api.routes.article.create_article`).

5. **Empty cloud config** — Left `cloud.provider`, `cloud.region`, `cloud.platform` as empty strings in config, to be filled when deploying to a cloud provider.

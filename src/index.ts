#!/usr/bin/env node

/**
 * Beakpoint Wingman CLI entry point.
 * @description Bootstraps the application by resolving the project directory from the current
 * working directory, creating the default {@link BundledTagsProvider}, and starting the
 * {@link Orchestrator} guided setup workflow.
 */

import { Orchestrator } from "./orchestrator/orchestrator.js";
import { BundledTagsProvider } from "./tags/bundled-provider.js";
import { displayError } from "./ui/display.js";

const projectDir = process.cwd();
const tagsProvider = new BundledTagsProvider();
const orchestrator = new Orchestrator(projectDir, tagsProvider);

orchestrator.run().catch((err) => {
  displayError(`Wingman encountered an error: ${err.message}`);
  process.exit(1);
});

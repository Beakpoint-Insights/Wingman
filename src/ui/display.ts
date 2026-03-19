import chalk from "chalk";

/**
 * Prints a styled phase header to the terminal.
 * @param phaseName - Human-readable name of the phase.
 * @param stepNumber - 1-based step index shown in the header.
 */
export function displayPhaseHeader(phaseName: string, stepNumber: number): void {
  console.log("");
  console.log(chalk.bold.cyan(`═══ Phase ${stepNumber}: ${phaseName} ═══`));
  console.log("");
}

/**
 * Prints a preview of the generated prompt to the terminal.
 * @param prompt - The full prompt text to display between delimiter lines.
 */
export function displayPromptPreview(prompt: string): void {
  console.log(chalk.dim("─── Prompt Preview ───"));
  console.log("");
  console.log(prompt);
  console.log("");
  console.log(chalk.dim("─── End Preview ───"));
}

/**
 * Prints a yellow instructional message prefixed with an arrow.
 * @param message - The instruction text to display.
 */
export function displayInstruction(message: string): void {
  console.log(chalk.yellow("→ " + message));
}

/**
 * Prints a green success message prefixed with a checkmark.
 * @param message - The success text to display.
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green("✓ " + message));
}

/**
 * Prints a yellow warning message prefixed with a warning symbol.
 * @param message - The warning text to display.
 */
export function displayWarning(message: string): void {
  console.log(chalk.yellow("⚠ " + message));
}

/**
 * Prints a red error message prefixed with a cross.
 * @param message - The error text to display.
 */
export function displayError(message: string): void {
  console.log(chalk.red("✗ " + message));
}

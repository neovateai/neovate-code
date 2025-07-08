/**
 * Check if the given model is a Claude model
 * @param model - The model name to check
 * @returns true if the model is a Claude model
 */
export function isClaude(model: string): boolean {
  return (
    model.includes('claude') ||
    model.includes('sonnet') ||
    model.includes('opus')
  );
}

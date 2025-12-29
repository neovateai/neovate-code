export function safeParseJson(json: string) {
  try {
    return JSON.parse(json);
  } catch (_error) {
    return {};
  }
}

export function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

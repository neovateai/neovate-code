export function safeParseJson(json: string) {
  try {
    return JSON.parse(json);
  } catch (_error) {
    return {};
  }
}

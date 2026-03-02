const AGENT_MENTION_REGEX = /(^|\s)@(agent-[\w:.@-]+)/g;

export function extractAgentMentions(text: string): string[] {
  const matches = text.match(AGENT_MENTION_REGEX) || [];
  const mentions = matches.map((m) => m.slice(m.indexOf('@') + 1));
  return [...new Set(mentions)];
}

export function getAgentTypeFromMention(mention: string): string {
  return mention.replace('agent-', '');
}

export function buildAgentMentionPrompt(agentType: string): string {
  return `<system-reminder>
The user has expressed a desire to invoke the agent "${agentType}". Please invoke the agent appropriately, passing in the required context to it.
</system-reminder>`;
}

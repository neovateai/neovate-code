import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { LogEntry } from '../jsonl';

export function parseJsonlHistory(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  try {
    const files = readdirSync(directoryPath);
    const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'));

    const userMessages: string[] = [];

    for (const file of jsonlFiles) {
      const filePath = join(directoryPath, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content
          .trim()
          .split('\n')
          .filter((line) => line.trim());

        for (const line of lines) {
          try {
            const logEntry: LogEntry = JSON.parse(line);

            if (logEntry.type === 'user' && logEntry.message.role === 'user') {
              const messageContent = logEntry.message.content;

              if (typeof messageContent === 'string') {
                userMessages.push(messageContent);
              } else if (Array.isArray(messageContent)) {
                // Handle array of MessageContent objects
                const textContent = messageContent
                  .filter((content) => content.type === 'text' && content.text)
                  .map((content) => content.text!)
                  .join(' ');

                if (textContent) {
                  userMessages.push(textContent);
                }
              }
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            continue;
          }
        }
      } catch (fileError) {
        // Skip files that can't be read
        continue;
      }
    }

    return userMessages;
  } catch (error) {
    return [];
  }
}

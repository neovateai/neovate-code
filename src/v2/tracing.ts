import {
  BatchTraceProcessor,
  Span,
  Trace,
  TracingExporter,
  setTraceProcessors,
} from '@openai/agents';
import fs from 'fs/promises';

class FileExporter implements TracingExporter {
  constructor(private filePath: string) {}

  async export(items: (Trace | Span<any>)[]): Promise<void> {
    const serializedItems = items.map((item) => item.toJSON()).filter(Boolean);
    if (serializedItems.length > 0) {
      const data = JSON.stringify(serializedItems, null, 2) + '\n';
      await fs.appendFile(this.filePath, data);
    }
  }
}

export function setupTracing(filePath: string) {
  const exporter = new FileExporter(filePath);
  const processor = new BatchTraceProcessor(exporter);
  setTraceProcessors([processor]);
}

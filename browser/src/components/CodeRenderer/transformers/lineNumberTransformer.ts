import type { ShikiTransformer } from 'shiki';

export interface LineNumberOptions {
  startLine?: number;
}

export function createLineNumberTransformer(
  options: LineNumberOptions = {},
): ShikiTransformer {
  const { startLine = 1 } = options;

  // Validate startLine
  const validStartLine = Math.max(1, Math.floor(startLine));

  return {
    name: 'line-number-transformer',
    pre(node) {
      try {
        // Add class and custom properties to the pre element
        this.addClassToHast(node, 'shiki-with-line-numbers');

        // Set CSS custom properties for line number styling
        const style = node.properties?.style || '';
        node.properties = node.properties || {};
        node.properties.style = `${style}; --start-line: ${validStartLine};`;
      } catch (error) {
        console.error('Error in line number transformer pre:', error);
      }
    },
    line(node, line) {
      try {
        // Add line number element to each line
        const lineNumber = validStartLine + line - 1;

        // Create line number span element
        const lineNumberElement = {
          type: 'element' as const,
          tagName: 'span',
          properties: {
            class: 'line-number',
            'data-line': lineNumber,
            'aria-hidden': 'true',
          },
          children: [
            {
              type: 'text' as const,
              value: String(lineNumber),
            },
          ],
        };

        // Ensure node.children exists
        if (!node.children) {
          node.children = [];
        }

        // Add line number as the first child of the line
        node.children.unshift(lineNumberElement);

        // Add data attribute to the line itself
        node.properties = node.properties || {};
        node.properties['data-line'] = lineNumber;
      } catch (error) {
        console.error('Error in line number transformer line:', error);
      }
    },
  };
}

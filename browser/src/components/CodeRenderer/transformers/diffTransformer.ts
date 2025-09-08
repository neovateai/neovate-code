// Constants for diff markers
export const DIFF_MARKERS = {
  ADD: '// [!code ++]',
  REMOVE: '// [!code --]',
} as const;

/**
 * Custom diff transformer to handle diff notation markers
 * Processes [!code --] and [!code ++] markers and converts them to diff classes
 */
export const customDiffTransformer = () => {
  return {
    name: 'custom-diff-transformer',
    preprocess(code: string) {
      return code;
    },
    line(node: any, _line: number) {
      try {
        // Recursively get all text content from the line
        const getTextContent = (n: any): string => {
          if (n.type === 'text') {
            return n.value || '';
          }
          if (n.children) {
            return n.children.map(getTextContent).join('');
          }
          return '';
        };

        // Recursively remove markers from all text nodes
        const removeMarkers = (n: any, marker: string) => {
          if (n.type === 'text' && n.value) {
            // Improved regex: match marker with optional whitespace at line end
            n.value = n.value.replace(
              new RegExp(
                `\\s*${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
                'g',
              ),
              '',
            );
          }
          if (n.children) {
            n.children.forEach((child: any) => removeMarkers(child, marker));
          }
        };

        const lineText = getTextContent(node);

        // Check for diff markers and add classes to the line node
        if (lineText.includes(DIFF_MARKERS.REMOVE)) {
          // Add diff remove class
          const currentClass = node.properties?.class || '';
          node.properties = node.properties || {};
          node.properties.class = `${currentClass} diff remove`.trim();

          // Remove the marker from all text nodes recursively
          removeMarkers(node, DIFF_MARKERS.REMOVE);
        }

        if (lineText.includes(DIFF_MARKERS.ADD)) {
          // Add diff add class
          const currentClass = node.properties?.class || '';
          node.properties = node.properties || {};
          node.properties.class = `${currentClass} diff add`.trim();

          // Remove the marker from all text nodes recursively
          removeMarkers(node, DIFF_MARKERS.ADD);
        }
      } catch (error) {
        console.error('Error in diff transformer line:', error);
      }
    },
  };
};

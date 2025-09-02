// Constants for diff markers
const DIFF_MARKERS = {
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
    postprocess(html: string) {
      try {
        // Find all lines in the HTML and process them
        const lines = html.split('\n');
        const processedLines = lines.map((line) => {
          // Look for our diff markers and add classes
          if (line.includes(DIFF_MARKERS.REMOVE)) {
            // Remove the marker and add diff classes
            const cleanLine = line.replace(
              new RegExp(
                ` ${DIFF_MARKERS.REMOVE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                'g',
              ),
              '',
            );
            return cleanLine.replace(
              '<span class="line">',
              '<span class="line diff remove">',
            );
          }
          if (line.includes(DIFF_MARKERS.ADD)) {
            // Remove the marker and add diff classes
            const cleanLine = line.replace(
              new RegExp(
                ` ${DIFF_MARKERS.ADD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
                'g',
              ),
              '',
            );
            return cleanLine.replace(
              '<span class="line">',
              '<span class="line diff add">',
            );
          }
          return line;
        });

        return processedLines.join('\n');
      } catch (error) {
        console.error('Error in diff transformer:', error);
        return html; // Return original HTML on error
      }
    },
  };
};

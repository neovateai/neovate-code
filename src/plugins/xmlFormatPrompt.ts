import { Plugin } from '../pluginManager/types';
import { PluginContext } from '../types';

// Used to fix the issue where the parameters format in the tools returned by the large model is incorrect and unclosed
export const XML_FORMAT_VALIDATION_GUIDE_PROMPT = `
# XML Format Validation Guide

When encountering XML structure issues, please follow these steps:

1. Check XML tag completeness
   - Ensure all tags have proper opening and closing marks
   - Verify tags are correctly nested
   - Validate tag names match properly

2. Handle special characters
   - Use CDATA sections for content containing special characters
   - Properly escape XML special characters (&, <, >, ", ')

3. Content validation
   - Ensure content conforms to expected data structure
   - Verify required fields exist
   - Check if values are in correct format

4. Common fix patterns
   - Fix unclosed tags
   - Correct tag nesting order
   - Add missing required attributes
   - Normalize whitespace characters

Example format:
<root>
  <element attribute="value">
    <![CDATA[Special content]]>
  </element>
</root>
`;
export const xmlFormatPromptPlugin: Plugin = {
  name: 'xml-format-prompt-plugin',
  configResolved(this: PluginContext, { resolvedConfig }) {
    const model =
      typeof resolvedConfig.model === 'string'
        ? resolvedConfig.model
        : resolvedConfig.model.modelId;

    if (model.includes('claude')) {
      resolvedConfig.systemPrompt.push(XML_FORMAT_VALIDATION_GUIDE_PROMPT);
    }
  },
};

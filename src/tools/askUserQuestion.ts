import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';

const MAX_HEADER_LENGTH = 12;

const QuestionOptionSchema = z.object({
  label: z
    .string()
    .describe(
      'The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.',
    ),
  description: z
    .string()
    .describe(
      'Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.',
    ),
});

const QuestionSchema = z.object({
  question: z
    .string()
    .describe(
      'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?',
    ),
  header: z
    .string()
    .describe(
      `Very short label displayed as a chip/tag (max ${MAX_HEADER_LENGTH} chars). Examples: "Auth method", "Library", "Approach".`,
    ),
  options: z
    .array(QuestionOptionSchema)
    .min(2)
    .max(4)
    .describe(
      `The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.`,
    ),
  multiSelect: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.',
    ),
});

const AskUserQuestionInputSchema = z
  .object({
    questions: z
      .array(QuestionSchema)
      .min(1)
      .max(4)
      .describe('Questions to ask the user (1-4 questions)'),
    answers: z
      .record(z.string(), z.string())
      .optional()
      .describe('User answers collected by the permission component'),
  })
  .refine(
    (data) => {
      const questionTexts = data.questions.map((q) => q.question);
      return questionTexts.length === new Set(questionTexts).size;
    },
    {
      message:
        'Question texts must be unique, option labels must be unique within each question',
    },
  )
  .refine(
    (data) => {
      for (const question of data.questions) {
        const labels = question.options.map((o) => o.label);
        if (labels.length !== new Set(labels).size) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Option labels must be unique within each question',
    },
  );

export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type AskUserQuestionInput = z.infer<typeof AskUserQuestionInputSchema>;

const TOOL_DESCRIPTION = `
Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question`;

export function createAskUserQuestionTool() {
  return createTool({
    name: TOOL_NAMES.ASK_USER_QUESTION,
    description: TOOL_DESCRIPTION,
    parameters: AskUserQuestionInputSchema,
    async execute({ questions, answers }) {
      if (!answers || Object.keys(answers).length === 0) {
        return {
          isError: true,
          llmContent: 'No answers provided by user',
        };
      }

      const answerSummary = Object.entries(answers)
        .map(([question, answer]) => `"${question}" = "${answer}"`)
        .join(', ');

      return {
        llmContent: `User has answered your questions: ${answerSummary}. You can now continue with the user's answers in mind.`,
      };
    },
    approval: {
      // Always require user input, even in yolo mode
      category: 'ask',
      needsApproval: () => true,
    },
  });
}

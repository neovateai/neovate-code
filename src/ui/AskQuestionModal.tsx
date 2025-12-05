import { Box, Text, useInput } from 'ink';
import React, { useCallback, useMemo } from 'react';
import type { Question } from '../tools/askUserQuestion';
import { UI_COLORS } from './constants';
import { SelectInput, type SelectOption } from './SelectInput';
import type { ApprovalResult } from './store';
import { useQuestionState } from './useQuestionState';
import { useTerminalSize } from './useTerminalSize';

interface AskQuestionModalProps {
  questions: Question[];
  onResolve: (
    result: ApprovalResult,
    updatedAnswers?: Record<string, string>,
  ) => void;
}

export function AskQuestionModal({
  questions,
  onResolve,
}: AskQuestionModalProps) {
  // State management
  const {
    currentQuestionIndex,
    answers,
    questionStates,
    isInTextInput,
    nextQuestion,
    prevQuestion,
    updateQuestionState,
    setAnswer,
    setTextInputMode,
  } = useQuestionState();

  // Compute state - add boundary check
  const currentQuestion =
    questions[Math.min(currentQuestionIndex, questions.length - 1)];
  const isSubmitPage = currentQuestionIndex >= questions.length;
  const allAnswered = questions.every((q) => !!answers[q.question]);
  const isSingleQuestionMode =
    questions.length === 1 && !questions[0].multiSelect;

  // Cancel callback
  const handleCancel = useCallback(() => {
    onResolve('deny');
  }, [onResolve]);

  // Submit callback
  const handleSubmit = useCallback(
    (finalAnswers: Record<string, string>) => {
      onResolve('approve_once', finalAnswers);
    },
    [onResolve],
  );

  // Answer setting callback
  const handleSetAnswer = useCallback(
    (
      questionText: string,
      value: string | string[],
      customText?: string,
      shouldAdvance = true,
    ) => {
      let answerText: string;
      const isArray = Array.isArray(value);

      // Multi-select answers separated by commas
      if (isArray) {
        answerText = value.join(', ');
      } else {
        answerText = customText || value;
      }

      // Single question single selection mode: submit directly
      const isSingleQuestion = questions.length === 1;
      if (!isArray && isSingleQuestion && shouldAdvance) {
        const finalAnswers = { ...answers, [questionText]: answerText };
        handleSubmit(finalAnswers);
        return;
      }

      setAnswer(questionText, answerText, shouldAdvance);
    },
    [questions.length, answers, handleSubmit, setAnswer],
  );

  // Keyboard navigation (Tab/Arrow keys to switch questions)
  useInput(
    (input, key) => {
      if (isInTextInput && !isSubmitPage) return;
      if (key.return) return;

      if (
        (key.leftArrow || (key.shift && key.tab)) &&
        currentQuestionIndex > 0
      ) {
        prevQuestion();
      }

      const maxIndex = isSingleQuestionMode
        ? questions.length - 1
        : questions.length;

      if (
        (key.rightArrow || (key.tab && !key.shift)) &&
        currentQuestionIndex < maxIndex
      ) {
        nextQuestion();
      }
    },
    { isActive: true },
  );

  // Render current question
  if (!isSubmitPage && currentQuestion) {
    return (
      <QuestionView
        question={currentQuestion}
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
        questionStates={questionStates}
        hideSubmitTab={isSingleQuestionMode}
        onUpdateQuestionState={updateQuestionState}
        onAnswer={handleSetAnswer}
        onTextInputFocus={setTextInputMode}
        onCancel={handleCancel}
        onSubmit={nextQuestion}
      />
    );
  }

  // Render submit page
  if (isSubmitPage) {
    return (
      <SubmitView
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
        allQuestionsAnswered={allAnswered}
        onFinalResponse={(action) => {
          if (action === 'cancel') handleCancel();
          if (action === 'submit') handleSubmit(answers);
        }}
      />
    );
  }

  return null;
}

// ==================== QuestionNav Component ====================

interface QuestionNavProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  hideSubmitTab?: boolean;
}

function QuestionNav({
  questions,
  currentQuestionIndex,
  answers,
  hideSubmitTab = false,
}: QuestionNavProps) {
  const isSingleHidden = questions.length === 1 && hideSubmitTab;

  return (
    <Box flexDirection="row" marginBottom={1}>
      {!isSingleHidden && (
        <Text
          color={
            currentQuestionIndex === 0 ? UI_COLORS.ASK_SECONDARY : undefined
          }
        >
          ←{' '}
        </Text>
      )}

      {questions.map((q, index) => {
        const isActive = index === currentQuestionIndex;
        const isAnswered = !!answers[q.question];
        const icon = isAnswered ? '☑' : '□';
        const displayText = q.header ? ` ${icon} ${q.header} ` : ` ${icon} `;

        return (
          <React.Fragment key={q.question}>
            {isActive ? (
              <Text
                backgroundColor={UI_COLORS.ASK_NAV_ACTIVE_BG}
                color={UI_COLORS.ASK_NAV_ACTIVE_TEXT}
              >
                {displayText}
              </Text>
            ) : (
              <Text color={isAnswered ? undefined : UI_COLORS.ASK_SECONDARY}>
                {displayText}
              </Text>
            )}
          </React.Fragment>
        );
      })}

      {!hideSubmitTab &&
        (currentQuestionIndex === questions.length ? (
          <Text
            backgroundColor={UI_COLORS.ASK_NAV_ACTIVE_BG}
            color={UI_COLORS.ASK_NAV_ACTIVE_TEXT}
          >
            {' '}
            ✓ Submit{' '}
          </Text>
        ) : (
          <Text color={UI_COLORS.ASK_SECONDARY}> ✓ Submit </Text>
        ))}

      {!isSingleHidden && (
        <Text
          color={
            currentQuestionIndex === questions.length
              ? UI_COLORS.ASK_SECONDARY
              : undefined
          }
        >
          {' '}
          →
        </Text>
      )}
    </Box>
  );
}

// ==================== QuestionView Component ====================

interface QuestionViewProps {
  question: Question;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  questionStates: any;
  hideSubmitTab: boolean;
  onUpdateQuestionState: (
    questionText: string,
    updates: any,
    isMultiSelect: boolean,
  ) => void;
  onAnswer: (
    questionText: string,
    value: string | string[],
    customText?: string,
    shouldAdvance?: boolean,
  ) => void;
  onTextInputFocus: (isInInput: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function QuestionBorder() {
  const { columns } = useTerminalSize();
  return (
    <Box marginBottom={1}>
      <Text color={UI_COLORS.CHAT_BORDER}>
        {'─'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
}

function QuestionView({
  question,
  questions,
  currentQuestionIndex,
  answers,
  questionStates,
  hideSubmitTab,
  onUpdateQuestionState,
  onAnswer,
  onTextInputFocus,
  onCancel,
  onSubmit,
}: QuestionViewProps) {
  // Text input focus callback
  const handleInputFocus = useCallback(
    (value: string) => {
      onTextInputFocus(value === '__other__');
    },
    [onTextInputFocus],
  );

  // Build options list
  const options: SelectOption[] = useMemo(() => {
    const predefinedOptions: SelectOption[] = question.options.map((opt) => ({
      type: 'text' as const,
      value: opt.label,
      label: opt.label,
      description: opt.description,
    }));

    const questionText = question.question;
    const state = questionStates[questionText];

    const otherOption: SelectOption = {
      type: 'input' as const,
      value: '__other__',
      label: 'Other',
      placeholder: 'Type something.',
      initialValue: state?.textInputValue ?? '',
      onChange: (value) => {
        onUpdateQuestionState(
          questionText,
          { textInputValue: value },
          question.multiSelect ?? false,
        );
      },
    };

    return [...predefinedOptions, otherOption];
  }, [question, questionStates, onUpdateQuestionState]);

  const questionText = question.question;
  const state = questionStates[questionText];

  return (
    <Box flexDirection="column">
      <QuestionBorder />

      {/* Navigation bar */}
      <QuestionNav
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
        hideSubmitTab={hideSubmitTab}
      />

      {/* Question title */}
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          {question.question}
        </Text>
      </Box>

      {/* Options list */}
      <SelectInput
        key={question.question}
        options={options}
        mode={question.multiSelect ? 'multi' : 'single'}
        defaultValue={state?.selectedValue}
        onChange={(value) => {
          onUpdateQuestionState(
            questionText,
            { selectedValue: value },
            question.multiSelect ?? false,
          );

          // Handle answer
          if (question.multiSelect) {
            const values = Array.isArray(value) ? value : [value];
            const hasOther = values.includes('__other__');
            const customText = hasOther ? state?.textInputValue : undefined;
            const finalValues = values
              .filter((v) => v !== '__other__')
              .concat(customText ? [customText] : []);
            onAnswer(questionText, finalValues, undefined, false);
          } else {
            const customText =
              value === '__other__' ? state?.textInputValue : undefined;
            onAnswer(questionText, value as string, customText);
          }
        }}
        onFocus={handleInputFocus}
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitButtonText={
          currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'
        }
      />

      {/* Operation hints */}
      <Box marginTop={1}>
        <Text dimColor color={UI_COLORS.ASK_SECONDARY}>
          Enter to select · Tab/Arrow keys to navigate · Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}

// ==================== SubmitView Component ====================

interface SubmitViewProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  allQuestionsAnswered: boolean;
  onFinalResponse: (action: 'submit' | 'cancel') => void;
}

function SubmitView({
  questions,
  currentQuestionIndex,
  answers,
  allQuestionsAnswered,
  onFinalResponse,
}: SubmitViewProps) {
  return (
    <Box flexDirection="column">
      {/* Top divider line */}
      <QuestionBorder />

      {/* Navigation bar */}
      <QuestionNav
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
      />

      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={UI_COLORS.ASK_PRIMARY}>
          Review your answers
        </Text>
      </Box>

      {/* Incomplete warning */}
      {!allQuestionsAnswered && (
        <Box marginBottom={1}>
          <Text color={UI_COLORS.ASK_WARNING}>
            ⚠ You have not answered all questions
          </Text>
        </Box>
      )}

      {/* Answer list */}
      {Object.keys(answers).length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {questions
            .filter((q) => answers[q.question])
            .map((q) => {
              const answer = answers[q.question];
              return (
                <Box key={q.question} flexDirection="column">
                  <Text dimColor>● {q.question}</Text>
                  <Text color={UI_COLORS.ASK_SUCCESS}> → {answer}</Text>
                </Box>
              );
            })}
        </Box>
      )}

      <Box marginBottom={1}>
        <Text dimColor>Ready to submit your answers?</Text>
      </Box>

      {/* Final choice */}
      <SelectInput
        options={[
          { type: 'text', label: 'Submit answers', value: 'submit' },
          { type: 'text', label: 'Cancel', value: 'cancel' },
        ]}
        mode="single"
        onChange={(value) => onFinalResponse(value as 'submit' | 'cancel')}
        onCancel={() => onFinalResponse('cancel')}
      />
    </Box>
  );
}

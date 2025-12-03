import { useCallback, useReducer } from 'react';

type QuestionStateItem = {
  selectedValue?: string | string[];
  textInputValue: string;
};

type QuestionState = {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  questionStates: Record<string, QuestionStateItem>;
  isInTextInput: boolean;
};

type QuestionAction =
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREV_QUESTION' }
  | {
      type: 'UPDATE_QUESTION_STATE';
      questionText: string;
      updates: Partial<QuestionStateItem>;
      isMultiSelect: boolean;
    }
  | {
      type: 'SET_ANSWER';
      questionText: string;
      answer: string;
      shouldAdvance: boolean;
    }
  | { type: 'SET_TEXT_INPUT_MODE'; isInInput: boolean };

const initialState: QuestionState = {
  currentQuestionIndex: 0,
  answers: {},
  questionStates: {},
  isInTextInput: false,
};

function questionReducer(
  state: QuestionState,
  action: QuestionAction,
): QuestionState {
  switch (action.type) {
    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        isInTextInput: false,
      };

    case 'PREV_QUESTION':
      return {
        ...state,
        currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
        isInTextInput: false,
      };

    case 'UPDATE_QUESTION_STATE': {
      const currentState = state.questionStates[action.questionText];
      const newState: QuestionStateItem = {
        selectedValue:
          action.updates.selectedValue !== undefined
            ? action.updates.selectedValue
            : (currentState?.selectedValue ??
              (action.isMultiSelect ? [] : undefined)),
        textInputValue:
          action.updates.textInputValue !== undefined
            ? action.updates.textInputValue
            : (currentState?.textInputValue ?? ''),
      };
      return {
        ...state,
        questionStates: {
          ...state.questionStates,
          [action.questionText]: newState,
        },
      };
    }

    case 'SET_ANSWER': {
      const newState = {
        ...state,
        answers: { ...state.answers, [action.questionText]: action.answer },
      };
      if (action.shouldAdvance) {
        return {
          ...newState,
          currentQuestionIndex: newState.currentQuestionIndex + 1,
          isInTextInput: false,
        };
      }
      return newState;
    }

    case 'SET_TEXT_INPUT_MODE':
      return { ...state, isInTextInput: action.isInInput };

    default:
      return state;
  }
}

export function useQuestionState() {
  const [state, dispatch] = useReducer(questionReducer, initialState);

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  const prevQuestion = useCallback(() => {
    dispatch({ type: 'PREV_QUESTION' });
  }, []);

  const updateQuestionState = useCallback(
    (
      questionText: string,
      updates: Partial<QuestionStateItem>,
      isMultiSelect: boolean,
    ) => {
      dispatch({
        type: 'UPDATE_QUESTION_STATE',
        questionText,
        updates,
        isMultiSelect,
      });
    },
    [],
  );

  const setAnswer = useCallback(
    (questionText: string, answer: string, shouldAdvance = true) => {
      dispatch({ type: 'SET_ANSWER', questionText, answer, shouldAdvance });
    },
    [],
  );

  const setTextInputMode = useCallback((isInInput: boolean) => {
    dispatch({ type: 'SET_TEXT_INPUT_MODE', isInInput });
  }, []);

  return {
    currentQuestionIndex: state.currentQuestionIndex,
    answers: state.answers,
    questionStates: state.questionStates,
    isInTextInput: state.isInTextInput,
    nextQuestion,
    prevQuestion,
    updateQuestionState,
    setAnswer,
    setTextInputMode,
  };
}

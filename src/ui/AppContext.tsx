import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { Context } from '../context';
import { Service } from '../service';
import { APP_STAGE, APP_STATUS, MESSAGE_ROLES } from './constants';

// Re-export constants for convenience
export { APP_STATUS, APP_STAGE, MESSAGE_ROLES };

// Types
export interface Message {
  role: (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];
  content: {
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, any>;
    result?: any;
  };
}

export interface AppState {
  // Core app state
  productName: string;
  version: string;
  generalInfo: Record<string, string>;
  stage: (typeof APP_STAGE)[keyof typeof APP_STAGE];
  initialPrompt?: string;

  // Status and error handling
  status: (typeof APP_STATUS)[keyof typeof APP_STATUS];
  error: string | null;

  // Messages and conversation
  messages: Message[];
  currentMessage: Message | null;

  // History and input
  history: string[];
  historyIndex: number | null;
  draftInput: string | null;

  // Tool execution
  currentExecutingTool: {
    name: string;
    description: string;
  } | null;

  // Modal states
  planModal: { text: string } | null;
  slashCommandJSX: ReactNode | null;

  // Approval system
  approval: {
    pending: boolean;
    callId: string | null;
    toolName: string | null;
    params: Record<string, any> | null;
    resolve: ((approved: boolean) => void) | null;
    isModifying: boolean;
  };

  // Approval memory
  approvalMemory: {
    proceedOnce: Set<string>;
    proceedAlways: Set<string>;
    proceedAlwaysTool: Set<string>;
  };
}

// Action types
export type AppAction =
  | { type: 'SET_STATUS'; payload: AppState['status'] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STAGE'; payload: AppState['stage'] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_CURRENT_MESSAGE'; payload: Message | null }
  | { type: 'CLEAR_CURRENT_MESSAGE' }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_PLAN_MODAL'; payload: { text: string } | null }
  | { type: 'SET_SLASH_COMMAND_JSX'; payload: ReactNode | null }
  | { type: 'ADD_HISTORY'; payload: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_HISTORY_INDEX'; payload: number | null }
  | { type: 'SET_DRAFT_INPUT'; payload: string | null }
  | {
      type: 'SET_CURRENT_EXECUTING_TOOL';
      payload: AppState['currentExecutingTool'];
    }
  | {
      type: 'SET_APPROVAL_PENDING';
      payload: {
        pending: boolean;
        callId?: string | null;
        toolName?: string | null;
        params?: Record<string, any> | null;
        resolve?: ((approved: boolean) => void) | null;
        isModifying?: boolean;
      };
    }
  | {
      type: 'ADD_APPROVAL_MEMORY';
      payload: { type: 'once' | 'always' | 'tool'; key: string };
    }
  | {
      type: 'REMOVE_APPROVAL_MEMORY';
      payload: { type: 'once' | 'always' | 'tool'; key: string };
    }
  | { type: 'CLEAR_APPROVAL_MEMORY' };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_STAGE':
      return { ...state, stage: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'SET_CURRENT_MESSAGE':
      return { ...state, currentMessage: action.payload };

    case 'CLEAR_CURRENT_MESSAGE':
      return { ...state, currentMessage: null };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    case 'SET_PLAN_MODAL':
      return { ...state, planModal: action.payload };

    case 'SET_SLASH_COMMAND_JSX':
      return { ...state, slashCommandJSX: action.payload };

    case 'ADD_HISTORY':
      return { ...state, history: [...state.history, action.payload] };

    case 'CLEAR_HISTORY':
      return { ...state, history: [] };

    case 'SET_HISTORY_INDEX':
      return { ...state, historyIndex: action.payload };

    case 'SET_DRAFT_INPUT':
      return { ...state, draftInput: action.payload };

    case 'SET_CURRENT_EXECUTING_TOOL':
      return { ...state, currentExecutingTool: action.payload };

    case 'SET_APPROVAL_PENDING':
      return {
        ...state,
        approval: {
          ...state.approval,
          ...action.payload,
        },
      };

    case 'ADD_APPROVAL_MEMORY': {
      const { type, key } = action.payload;
      const newMemory = { ...state.approvalMemory };

      if (type === 'once') {
        newMemory.proceedOnce = new Set([...newMemory.proceedOnce, key]);
      } else if (type === 'always') {
        newMemory.proceedAlways = new Set([...newMemory.proceedAlways, key]);
      } else if (type === 'tool') {
        newMemory.proceedAlwaysTool = new Set([
          ...newMemory.proceedAlwaysTool,
          key,
        ]);
      }

      return { ...state, approvalMemory: newMemory };
    }

    case 'REMOVE_APPROVAL_MEMORY': {
      const { type, key } = action.payload;
      const newMemory = { ...state.approvalMemory };

      if (type === 'once') {
        newMemory.proceedOnce = new Set(newMemory.proceedOnce);
        newMemory.proceedOnce.delete(key);
      } else if (type === 'always') {
        newMemory.proceedAlways = new Set(newMemory.proceedAlways);
        newMemory.proceedAlways.delete(key);
      } else if (type === 'tool') {
        newMemory.proceedAlwaysTool = new Set(newMemory.proceedAlwaysTool);
        newMemory.proceedAlwaysTool.delete(key);
      }

      return { ...state, approvalMemory: newMemory };
    }

    case 'CLEAR_APPROVAL_MEMORY':
      return {
        ...state,
        approvalMemory: {
          proceedOnce: new Set(),
          proceedAlways: new Set(),
          proceedAlwaysTool: new Set(),
        },
      };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  services: {
    service: Service;
    planService: Service;
    context: Context;
  };
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
interface AppProviderProps {
  children: ReactNode;
  context: Context;
  service: Service;
  planService: Service;
  stage: (typeof APP_STAGE)[keyof typeof APP_STAGE];
  initialPrompt?: string;
}

export function AppProvider({
  children,
  context,
  service,
  planService,
  stage,
  initialPrompt,
}: AppProviderProps) {
  const initialState: AppState = {
    productName: context.productName,
    version: context.version,
    generalInfo: context.generalInfo,
    stage,
    initialPrompt,
    status: APP_STATUS.IDLE,
    error: null,
    messages: [],
    currentMessage: null,
    history: context.history,
    historyIndex: null,
    draftInput: null,
    currentExecutingTool: null,
    planModal: null,
    slashCommandJSX: null,
    approval: {
      pending: false,
      callId: null,
      toolName: null,
      params: null,
      resolve: null,
      isModifying: false,
    },
    approvalMemory: {
      proceedOnce: new Set(),
      proceedAlways: new Set(),
      proceedAlwaysTool: new Set(),
    },
  };

  const [state, dispatch] = useReducer(appReducer, initialState);

  const contextValue: AppContextType = {
    state,
    dispatch,
    // dispatch: (...args) => {
    //   fs.appendFileSync(
    //     '/Users/chencheng/Documents/Code/github.com/sorrycc/takumi/dispatch.log',
    //     JSON.stringify(args) + '\n',
    //   );
    //   dispatch(...args);
    // },
    services: {
      service,
      planService,
      context,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

// Hook to use the app context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

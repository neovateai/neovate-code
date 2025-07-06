import { Box, Static } from 'ink';
import React, { useEffect, useRef } from 'react';
import { useAppContext } from './AppContext';
import { ApprovalModal } from './components/ApprovalModal';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import { MessageWrapper } from './components/MessageComponents';
import { PlanModal } from './components/PlanModal';
import { useChatActions } from './hooks/useChatActions';
import { useDebounceResize } from './hooks/useDebounceResize';

export function App() {
  const [slashCommandJSX, setSlashCommandJSX] =
    React.useState<React.ReactNode | null>(null);
  const { state, dispatch } = useAppContext();
  const { processUserInput } = useChatActions();
  const initialPromptProcessed = useRef(false);
  const forceRerender = useDebounceResize();

  // Process initial prompt when app loads
  useEffect(() => {
    if (state.initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      processUserInput(state.initialPrompt, setSlashCommandJSX).catch(() => {});
    }
  }, [state.initialPrompt, processUserInput]);

  useEffect(() => {
    if (slashCommandJSX) {
      dispatch({ type: 'SET_SLASH_COMMAND_JSX_VISIBLE', payload: true });
    } else {
      dispatch({ type: 'SET_SLASH_COMMAND_JSX_VISIBLE', payload: false });
    }
  }, [slashCommandJSX]);

  const showModal = state.planModal || state.approval.pending;
  const modalContent = state.planModal ? (
    <PlanModal planText={state.planModal.text} />
  ) : state.approval.pending ? (
    <ApprovalModal />
  ) : null;

  return (
    <Box flexDirection="column" key={forceRerender}>
      <Static items={['header', ...state.messages] as any[]}>
        {(item, index) => {
          if (item === 'header') {
            return (
              <Header
                key={'header'}
                productName={state.productName}
                version={state.version}
                generalInfo={state.generalInfo}
              />
            );
          }
          return (
            <MessageWrapper
              key={index}
              message={item}
              productName={state.productName}
            />
          );
        }}
      </Static>
      {state.currentMessage && (
        <MessageWrapper
          message={state.currentMessage}
          productName={state.productName}
          dynamic
        />
      )}
      {slashCommandJSX && (
        <Box marginTop={1}>{slashCommandJSX as React.ReactNode}</Box>
      )}
      {showModal ? (
        modalContent
      ) : (
        <ChatInput setSlashCommandJSX={setSlashCommandJSX} />
      )}
    </Box>
  );
}

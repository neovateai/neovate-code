import { Box, Static } from 'ink';
import React, { useEffect, useRef } from 'react';
import { useAppContext } from './AppContext';
import { type QueuedMessage } from './AppContext';
import { ApprovalModal } from './components/ApprovalModal';
import { Header } from './components/Header';
import { MessageWrapper } from './components/MessageComponents';
import { PlanModal } from './components/PlanModal';
import { ChatInput } from './components/PromptInput';
import { QueueDisplay } from './components/QueueDisplay';
import { StatusDisplay } from './components/StatusDisplay';
import { useChatActions } from './hooks/useChatActions';
import { useTerminalRefresh } from './hooks/useTerminalRefresh';

export function App() {
  const [slashCommandJSX, setSlashCommandJSX] =
    React.useState<React.ReactNode | null>(null);
  const { state, dispatch, services } = useAppContext();
  const { processUserInput } = useChatActions();
  const initialPromptProcessed = useRef(false);
  const { forceRerender, forceUpdate } = useTerminalRefresh();

  // Process initial prompt when app loads
  useEffect(() => {
    if (state.initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      processUserInput(state.initialPrompt, setSlashCommandJSX).catch(() => {});
    }
  }, [state.initialPrompt, processUserInput]);

  useEffect(() => {
    if (state.model === services.context.config.model) return;
    // Update context config model
    services.context.config.model = state.model;

    // Update generalInfo with new model
    const newGeneralInfo = {
      ...state.generalInfo,
      Model: state.model,
    };

    // Update context generalInfo
    services.context.generalInfo = newGeneralInfo;

    // Update state generalInfo
    dispatch({ type: 'SET_GENERAL_INFO', payload: newGeneralInfo });
    forceUpdate();
  }, [state.model]);

  useEffect(() => {
    dispatch({
      type: 'SET_SLASH_COMMAND_JSX',
      payload: slashCommandJSX,
    });
  }, [slashCommandJSX]);

  // Queue management functions
  const handleAddToQueue = (content: string) => {
    const newMessage: QueuedMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_TO_QUEUE', payload: newMessage });
  };

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
      <StatusDisplay />
      {state.queuedMessages.length > 0 && (
        <QueueDisplay queuedMessages={state.queuedMessages} />
      )}
      {showModal ? (
        modalContent
      ) : (
        <ChatInput
          setSlashCommandJSX={setSlashCommandJSX}
          onAddToQueue={handleAddToQueue}
        />
      )}
    </Box>
  );
}

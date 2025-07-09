import { useAppContext } from '../AppContext';
import { useChatActions } from './useChatActions';

export function usePlanModal() {
  const { state, dispatch, services } = useAppContext();
  const { executeQuery } = useChatActions();

  const handlePlanApproval = async (approved: boolean) => {
    if (approved && state.planModal) {
      dispatch({ type: 'SET_PLAN_MODAL', payload: null });

      // Set currentMode based on config.approvalMode
      const config = services.context.config;
      const newMode =
        config.approvalMode === 'autoEdit' || config.approvalMode === 'yolo'
          ? 'normal'
          : 'autoEdit';
      dispatch({ type: 'SET_CURRENT_MODE', payload: newMode });

      await executeQuery(state.planModal.text, 'code');
    } else {
      dispatch({ type: 'SET_PLAN_MODAL', payload: null });
    }
  };

  const closePlanModal = () => {
    dispatch({ type: 'SET_PLAN_MODAL', payload: null });
  };

  return {
    handlePlanApproval,
    closePlanModal,
  };
}

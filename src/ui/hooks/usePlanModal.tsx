import { useAppContext } from '../AppContext';
import { APP_STAGE } from '../constants';
import { useChatActions } from './useChatActions';

export function usePlanModal() {
  const { state, dispatch } = useAppContext();
  const { executeQuery } = useChatActions();

  const handlePlanApproval = async (approved: boolean) => {
    if (approved && state.planModal) {
      dispatch({ type: 'SET_STAGE', payload: APP_STAGE.CODE });
      dispatch({ type: 'SET_PLAN_MODAL', payload: null });
      await executeQuery(state.planModal.text);
    } else {
      dispatch({ type: 'SET_STAGE', payload: APP_STAGE.PLAN });
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

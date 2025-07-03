import { LocalJSXCommand } from '../types';

export const clearCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'clear',
  description: 'Clear the chat messages',
  async call(onDone) {
    const React = await import('react');
    const { useAppContext } = await import('../../ui/hooks');

    return React.createElement(() => {
      const { services } = useAppContext();

      React.useEffect(() => {
        services.service.history.length = 0;
        services.planService.history.length = 0;
        onDone('Messages cleared.');
      }, []);

      return null;
    });
  },
};

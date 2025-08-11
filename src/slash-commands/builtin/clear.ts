import { type LocalJSXCommand } from '../types';

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
        services.service.clear();
        services.planService.clear();
        onDone('Messages cleared.');
      }, []);

      return null;
    });
  },
};

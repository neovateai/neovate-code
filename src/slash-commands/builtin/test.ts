import { LocalJSXCommand } from '../types';

export const testCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'test',
  description: 'Test local-jsx command with 3 second delay',
  async call(onDone, context) {
    // Use dynamic imports to avoid build-time issues
    const React = await import('react');
    const { Box, Text } = await import('ink');

    return React.createElement(() => {
      const [seconds, setSeconds] = React.useState(3);

      React.useEffect(() => {
        if (seconds === 0) {
          onDone('Test completed!');
          return;
        }

        const timer = setTimeout(() => {
          setSeconds((s: number) => s - 1);
        }, 1000);

        return () => clearTimeout(timer);
      }, [seconds]);

      return React.createElement(
        Box,
        {
          borderStyle: 'round',
          borderColor: 'blue',
          padding: 1,
        },
        React.createElement(
          Text,
          {
            color: 'blue',
          },
          `🧪 Testing... ${seconds} seconds remaining`,
        ),
      );
    });
  },
};

import { Box, Text } from 'ink';
import { useAppStore } from './store';

export function App() {
  const { models } = useAppStore();

  return (
    <Box flexDirection="column">
      <Text>Takumi App</Text>
      {models.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Available Models:</Text>
          {models.map((model, index) => (
            <Text key={index} color="cyan">
              - {model}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

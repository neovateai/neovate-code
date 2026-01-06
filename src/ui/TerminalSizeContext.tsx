import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

interface TerminalSize {
  columns: number;
  rows: number;
}

const TerminalSizeContext = createContext<TerminalSize | undefined>(undefined);

export function TerminalSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<TerminalSize>({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });

  useEffect(() => {
    function updateSize() {
      setSize({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
      });
    }

    process.stdout.on('resize', updateSize);
    return () => {
      process.stdout.off('resize', updateSize);
    };
  }, []);

  return (
    <TerminalSizeContext.Provider value={size}>
      {children}
    </TerminalSizeContext.Provider>
  );
}

export function useTerminalSize(): TerminalSize {
  const context = useContext(TerminalSizeContext);
  if (context === undefined) {
    throw new Error('useTerminalSize must be used within TerminalSizeProvider');
  }
  return context;
}

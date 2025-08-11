import createDebug from 'debug';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type SelectionInfo, type SelectionResult } from '../../ide';
import { type InstallationResult } from '../../utils/ide';
import { useAppContext } from '../AppContext';

const debug = createDebug('takumi:useIDEStatus');

const SELECTION_POLL_INTERVAL = 2000; // Poll every 2 seconds
const CONNECTION_RETRY_INTERVAL = 5000; // Retry connection every 5 seconds

export function useIDEStatus() {
  const { state, dispatch, services } = useAppContext();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionRetryRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyed = useRef(false);
  const setupCompleted = useRef(false);
  const [hasPort, setHasPort] = useState(false);

  const updateConnectionStatus = useCallback(
    (isConnected: boolean) => {
      if (isDestroyed.current) return;
      dispatch({ type: 'SET_IDE_CONNECTED', payload: isConnected });
    },
    [dispatch],
  );

  const updateInstallStatus = useCallback(
    (installStatus: 'not-detected' | 'detected' | 'connected') => {
      if (isDestroyed.current) return;
      dispatch({ type: 'SET_IDE_INSTALL_STATUS', payload: installStatus });
    },
    [dispatch],
  );

  const updateLatestSelection = useCallback(
    (selection: SelectionInfo | null) => {
      if (isDestroyed.current) return;
      dispatch({ type: 'SET_IDE_LATEST_SELECTION', payload: selection });
    },
    [dispatch],
  );

  const setupIDEIntegrationOnce = useCallback(async () => {
    if (isDestroyed.current || setupCompleted.current) return;

    const ide = services.context.ide;
    if (!ide) {
      debug('No IDE instance available for setup');
      return;
    }

    try {
      debug('Setting up IDE integration...');
      setupCompleted.current = true;

      const terminal = services.context.env.terminal;
      if (!terminal) {
        debug('No terminal detected, skipping IDE setup');
        updateInstallStatus('not-detected');
        return;
      }

      const result: InstallationResult | undefined =
        await ide.setupIDEIntegration(terminal);

      if (result) {
        debug('IDE setup result:', result);
        if (result.installed) {
          updateInstallStatus('detected');
        } else {
          updateInstallStatus('not-detected');
        }
      } else {
        debug('IDE setup skipped or failed');
        updateInstallStatus('not-detected');
      }
    } catch (error) {
      debug('IDE setup failed:', error);
      updateInstallStatus('not-detected');
    }
  }, [
    services.context.ide,
    services.context.env.terminal,
    updateInstallStatus,
  ]);

  const checkPort = useCallback(async () => {
    if (isDestroyed.current) return;

    const ide = services.context.ide;
    if (!ide) {
      debug('No IDE instance available');
      return;
    }

    try {
      const port = await ide.findPort();
      const portAvailable = !!port;
      setHasPort(portAvailable);

      // Update install status based on port availability
      if (portAvailable) {
        updateInstallStatus('detected');
      } else {
        updateInstallStatus('not-detected');
      }

      debug('IDE port check:', { port, available: portAvailable });
      return portAvailable;
    } catch (error) {
      debug('Failed to find IDE port:', error);
      setHasPort(false);
      updateInstallStatus('not-detected');
      return false;
    }
  }, [services.context.ide, updateInstallStatus]);

  const attemptConnection = useCallback(async () => {
    if (isDestroyed.current) return;

    const ide = services.context.ide;
    if (!ide) {
      debug('No IDE instance available');
      return;
    }

    // Check if port is available first
    const portAvailable = await checkPort();
    if (!portAvailable) {
      debug('No IDE port available, skipping connection attempt');
      return;
    }

    try {
      debug('Attempting IDE connection...');
      await ide.connect();
      debug('IDE connected successfully');
      updateConnectionStatus(true);
      updateInstallStatus('connected');

      // Clear any pending connection retries
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current);
        connectionRetryRef.current = null;
      }
    } catch (error) {
      debug('Failed to connect to IDE:', error);
      updateConnectionStatus(false);
      updateInstallStatus('detected'); // Port available but connection failed

      // Schedule retry if not already scheduled
      if (!connectionRetryRef.current && !isDestroyed.current) {
        connectionRetryRef.current = setTimeout(() => {
          connectionRetryRef.current = null;
          attemptConnection();
        }, CONNECTION_RETRY_INTERVAL);
      }
    }
  }, [
    services.context.ide,
    updateConnectionStatus,
    updateInstallStatus,
    checkPort,
  ]);

  const pollLatestSelection = useCallback(async () => {
    if (isDestroyed.current) return;

    const ide = services.context.ide;
    if (!ide || !state.ide.isConnected) {
      return;
    }

    try {
      const result: SelectionResult = await ide.getLatestSelection();

      // Check if result has error property (SelectionErrorResponse)
      if ('error' in result) {
        debug('Error getting latest selection:', result.error);
        return;
      }

      // It's a SelectionResponse
      updateLatestSelection(result);
      debug('Updated latest selection:', result);
    } catch (error) {
      debug('Failed to get latest selection:', error);
      // Connection might be lost, update status
      updateConnectionStatus(false);
      updateInstallStatus('detected'); // Still detected but connection lost
    }
  }, [
    services.context.ide,
    state.ide.isConnected,
    updateLatestSelection,
    updateConnectionStatus,
    updateInstallStatus,
  ]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || isDestroyed.current) return;

    debug('Starting selection polling');
    pollingIntervalRef.current = setInterval(
      pollLatestSelection,
      SELECTION_POLL_INTERVAL,
    );
  }, [pollLatestSelection]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      debug('Stopping selection polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Start/stop polling based on connection status
  useEffect(() => {
    if (state.ide.isConnected) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [state.ide.isConnected, startPolling, stopPolling]);

  // Initial IDE setup, port check and connection attempt
  useEffect(() => {
    const initializeIDE = async () => {
      // First, attempt IDE setup and extension installation
      await setupIDEIntegrationOnce();

      // Then check for port availability
      const portAvailable = await checkPort();

      // Finally, attempt connection if port is available
      if (portAvailable) {
        attemptConnection();
      }
    };

    initializeIDE();
  }, [setupIDEIntegrationOnce, checkPort, attemptConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyed.current = true;
      stopPolling();
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current);
      }
    };
  }, [stopPolling]);

  return {
    isConnected: state.ide.isConnected,
    latestSelection: state.ide.latestSelection,
    installStatus: state.ide.installStatus,
    hasPort,
    attemptConnection,
  };
}

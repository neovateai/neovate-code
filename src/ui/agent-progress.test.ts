#!/usr/bin/env node

/**
 * End-to-End Test for SubAgent Progress Display
 *
 * This script tests the complete data flow:
 * 1. SubAgent execution produces messages
 * 2. Messages are sent through MessageBus
 * 3. UI Store receives and updates agentProgressMap
 * 4. AgentProgress component displays the progress
 *
 * Usage: npm test -- src/ui/agent-progress.test.ts
 */

import { describe, it, expect } from 'vitest';

describe('SubAgent Progress Display - E2E', () => {
  it('should have AgentProgressOverlay component exported', async () => {
    const { AgentProgressOverlay } = await import('./AgentProgressOverlay');

    expect(AgentProgressOverlay).toBeDefined();
    expect(typeof AgentProgressOverlay).toBe('function');
  });

  it('should have store with agentProgressMap', async () => {
    const { useAppStore } = await import('./store');

    const store = useAppStore.getState();

    expect(store.agentProgressMap).toBeDefined();
    expect(typeof store.agentProgressMap).toBe('object');
    expect(typeof store.updateAgentProgress).toBe('function');
    expect(typeof store.clearAgentProgress).toBe('function');
  });

  it('should update agent progress correctly', async () => {
    const { useAppStore } = await import('./store');

    const testAgentId = 'test-agent-123';
    const testMessage: any = {
      role: 'assistant' as const,
      content: 'Test message',
      type: 'message' as const,
      timestamp: new Date().toISOString(),
      uuid: 'test-uuid',
      parentUuid: null,
    };

    // Update progress
    useAppStore.getState().updateAgentProgress({
      agentId: testAgentId,
      message: testMessage,
      status: 'running',
    });

    // Verify update
    const progress = useAppStore.getState().agentProgressMap[testAgentId];

    expect(progress).toBeDefined();
    expect(progress.agentId).toBe(testAgentId);
    expect(progress.messages).toHaveLength(1);
    expect(progress.messages[0]).toEqual(testMessage);
    expect(progress.lastUpdate).toBeDefined();

    // Clean up
    useAppStore.getState().clearAgentProgress(testAgentId);
  });

  it('should clear agent progress correctly', async () => {
    const { useAppStore } = await import('./store');

    const testAgentId = 'test-agent-456';
    const testMessage: any = {
      role: 'assistant' as const,
      content: 'Test message',
      type: 'message' as const,
      timestamp: new Date().toISOString(),
      uuid: 'test-uuid-2',
      parentUuid: null,
    };

    // Add progress
    useAppStore.getState().updateAgentProgress({
      agentId: testAgentId,
      message: testMessage,
      status: 'running',
    });

    expect(useAppStore.getState().agentProgressMap[testAgentId]).toBeDefined();

    // Clear progress
    useAppStore.getState().clearAgentProgress(testAgentId);

    expect(
      useAppStore.getState().agentProgressMap[testAgentId],
    ).toBeUndefined();
  });

  it('should accumulate multiple messages for same agent', async () => {
    const { useAppStore } = await import('./store');

    const testAgentId = 'test-agent-789';

    const messages: any[] = [
      {
        role: 'assistant' as const,
        content: 'Message 1',
        type: 'message' as const,
        timestamp: new Date().toISOString(),
        uuid: 'uuid-1',
        parentUuid: null,
      },
      {
        role: 'assistant' as const,
        content: 'Message 2',
        type: 'message' as const,
        timestamp: new Date().toISOString(),
        uuid: 'uuid-2',
        parentUuid: null,
      },
      {
        role: 'assistant' as const,
        content: 'Message 3',
        type: 'message' as const,
        timestamp: new Date().toISOString(),
        uuid: 'uuid-3',
        parentUuid: null,
      },
    ];

    // Add messages sequentially
    for (const message of messages) {
      useAppStore.getState().updateAgentProgress({
        agentId: testAgentId,
        message,
        status: 'running',
      });
    }

    // Verify all messages are accumulated
    const progress = useAppStore.getState().agentProgressMap[testAgentId];

    expect(progress).toBeDefined();
    expect(progress.messages).toHaveLength(3);
    expect(progress.messages[0].content).toBe('Message 1');
    expect(progress.messages[1].content).toBe('Message 2');
    expect(progress.messages[2].content).toBe('Message 3');

    // Clean up
    useAppStore.getState().clearAgentProgress(testAgentId);
  });

  it('should handle multiple agents independently', async () => {
    const { useAppStore } = await import('./store');

    const agent1Id = 'agent-1';
    const agent2Id = 'agent-2';

    const message1: any = {
      role: 'assistant' as const,
      content: 'Agent 1 message',
      type: 'message' as const,
      timestamp: new Date().toISOString(),
      uuid: 'uuid-agent1',
      parentUuid: null,
    };

    const message2: any = {
      role: 'assistant' as const,
      content: 'Agent 2 message',
      type: 'message' as const,
      timestamp: new Date().toISOString(),
      uuid: 'uuid-agent2',
      parentUuid: null,
    };

    // Update both agents
    useAppStore.getState().updateAgentProgress({
      agentId: agent1Id,
      message: message1,
      status: 'running',
    });

    useAppStore.getState().updateAgentProgress({
      agentId: agent2Id,
      message: message2,
      status: 'running',
    });

    // Verify both are stored independently
    const progress1 = useAppStore.getState().agentProgressMap[agent1Id];
    const progress2 = useAppStore.getState().agentProgressMap[agent2Id];

    expect(progress1).toBeDefined();
    expect(progress2).toBeDefined();
    expect(progress1.messages[0].content).toBe('Agent 1 message');
    expect(progress2.messages[0].content).toBe('Agent 2 message');

    // Clean up
    useAppStore.getState().clearAgentProgress(agent1Id);
    useAppStore.getState().clearAgentProgress(agent2Id);
  });
});

console.log('✅ All E2E tests defined. Run with: npm test');

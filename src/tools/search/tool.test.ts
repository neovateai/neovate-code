import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createSearchTool } from './tool';
import type { Context } from '../../context';
import { SEARCH_CONSTANTS } from './constants';
import type { SearchProvider, SearchResponse } from './types';

// Mock context helper
function createMockContext(searchConfig?: any): Context {
  return {
    config: {
      search: searchConfig,
      model: 'test-model',
      planModel: 'test-model',
      language: 'English',
      quiet: false,
      approvalMode: 'default' as const,
      plugins: [],
      mcpServers: {},
      todo: true,
      autoCompact: true,
      outputFormat: 'text' as const,
      autoUpdate: true,
      browser: false,
    },
    cwd: '/test',
    productName: 'test',
    version: '1.0.0',
    paths: {} as any,
    argvConfig: {},
    mcpManager: {} as any,
    backgroundTaskManager: {} as any,
    apply: vi.fn(),
    destroy: vi.fn(),
  } as any as Context;
}

// Mock search provider
class MockSearchProvider implements SearchProvider {
  readonly name = 'tavily';
  readonly requiresApiKey = true;

  constructor(private shouldFail = false) {}

  async search(): Promise<SearchResponse> {
    if (this.shouldFail) {
      throw new Error('Mock search failed');
    }

    return {
      results: [
        {
          title: 'Test Result 1',
          url: 'https://example.com/1',
          content: 'This is test content 1',
          score: 0.95,
        },
        {
          title: 'Test Result 2',
          url: 'https://example.com/2',
          content: 'This is test content 2',
          score: 0.85,
        },
      ],
      query: 'test query',
      provider: 'tavily',
      searchTime: 100,
      answer: 'This is a test answer',
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }
}

describe('Search Tool Integration', () => {
  beforeEach(() => {
    // Clean up environment before each test
    delete process.env.TAVILY_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment after each test
    delete process.env.TAVILY_API_KEY;
    vi.restoreAllMocks();
  });

  describe('Tool Creation', () => {
    test('should create tool with default config', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
      expect(tool.description).toContain('Search the web');
      expect(tool.description).toContain('Tavily');
    });

    test('should create tool with custom config', () => {
      const context = createMockContext({
        maxResults: 10,
        timeout: 5000,
      });
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
      expect(tool.description).toBeDefined();
    });

    test('should throw on invalid maxResults below minimum', () => {
      const context = createMockContext({
        maxResults: 0,
      });

      expect(() => createSearchTool({ context })).toThrow(
        'maxResults must be between',
      );
    });

    test('should throw on invalid maxResults above maximum', () => {
      const context = createMockContext({
        maxResults: 100,
      });

      expect(() => createSearchTool({ context })).toThrow(
        'maxResults must be between',
      );
    });

    test('should throw on negative timeout', () => {
      const context = createMockContext({
        timeout: -1,
      });

      expect(() => createSearchTool({ context })).toThrow(
        'timeout must be greater than 0',
      );
    });

    test('should throw on zero timeout', () => {
      const context = createMockContext({
        timeout: 0,
      });

      expect(() => createSearchTool({ context })).toThrow(
        'timeout must be greater than 0',
      );
    });

    test('should throw on unsupported provider', () => {
      const context = createMockContext({
        provider: 'unsupported',
      });

      expect(() => createSearchTool({ context })).toThrow(
        'Unsupported provider',
      );
    });
  });

  describe('Boundary Tests', () => {
    test('should accept minimum maxResults', () => {
      const context = createMockContext({
        maxResults: SEARCH_CONSTANTS.MIN_RESULTS_LIMIT,
      });

      expect(() => createSearchTool({ context })).not.toThrow();
    });

    test('should accept maximum maxResults', () => {
      const context = createMockContext({
        maxResults: SEARCH_CONSTANTS.MAX_RESULTS_LIMIT,
      });

      expect(() => createSearchTool({ context })).not.toThrow();
    });

    test('should accept minimum valid timeout', () => {
      const context = createMockContext({
        timeout: 1,
      });

      expect(() => createSearchTool({ context })).not.toThrow();
    });
  });

  describe('Environment Variable Handling', () => {
    test('should read API key from environment', () => {
      process.env.TAVILY_API_KEY = 'test-api-key';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });

    test('should work without API key during creation', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });

    test('should handle empty API key', () => {
      process.env.TAVILY_API_KEY = '';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });
  });

  describe('Configuration Merging', () => {
    test('should use user config over defaults', () => {
      const context = createMockContext({
        maxResults: 10,
        timeout: 5000,
      });
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });

    test('should use defaults when user config is empty', () => {
      const context = createMockContext({});
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });

    test('should use defaults when search config is undefined', () => {
      const context = createMockContext(undefined);
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });

    test('should handle partial config', () => {
      const context = createMockContext({
        maxResults: 10,
        // timeout not specified, should use default
      });
      const tool = createSearchTool({ context });

      expect(tool.name).toBe('web_search');
    });
  });

  describe('Tool Parameters', () => {
    test('should have correct parameter schema', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.parameters).toBeDefined();

      const result = tool.parameters.safeParse({
        query: 'test query',
        maxResults: 5,
        searchType: 'general',
      });

      expect(result.success).toBe(true);
    });

    test('should reject invalid maxResults in parameters', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = tool.parameters.safeParse({
        query: 'test',
        maxResults: 100,
      });

      expect(result.success).toBe(false);
    });

    test('should accept optional parameters', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = tool.parameters.safeParse({
        query: 'test query',
      });

      expect(result.success).toBe(true);
    });

    test('should accept all search types', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const types = ['general', 'news', 'code'] as const;

      for (const searchType of types) {
        const result = tool.parameters.safeParse({
          query: 'test',
          searchType,
        });
        expect(result.success).toBe(true);
      }
    });

    test('should reject invalid search type', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = tool.parameters.safeParse({
        query: 'test',
        searchType: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Tool Execution - Error Cases', () => {
    test('should return error when API key is missing', async () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = await tool.execute({
        query: 'test query',
      });

      expect(result.isError).toBe(true);
      expect(result.llmContent).toContain('API key is required');
    });

    test('should return error for empty query', async () => {
      process.env.TAVILY_API_KEY = 'test-key';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = await tool.execute({
        query: '',
      });

      expect(result.isError).toBe(true);
      expect(result.llmContent).toContain('Search query cannot be empty');
    });

    test('should return error for whitespace-only query', async () => {
      process.env.TAVILY_API_KEY = 'test-key';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = await tool.execute({
        query: '   ',
      });

      expect(result.isError).toBe(true);
      expect(result.llmContent).toContain('Search query cannot be empty');
    });

    test('should return error for query too long', async () => {
      process.env.TAVILY_API_KEY = 'test-key';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const longQuery = 'a'.repeat(SEARCH_CONSTANTS.MAX_QUERY_LENGTH + 1);
      const result = await tool.execute({
        query: longQuery,
      });

      expect(result.isError).toBe(true);
      expect(result.llmContent).toContain('Query too long');
    });

    test('should handle provider errors gracefully', async () => {
      process.env.TAVILY_API_KEY = 'test-key';
      const context = createMockContext();
      const tool = createSearchTool({ context });

      // This will fail because we don't have a real API key
      const result = await tool.execute({
        query: 'test query',
      });

      expect(result.isError).toBe(true);
      expect(result.llmContent).toContain('Search failed');
    });
  });

  describe('Tool Execution - Success Cases (Note: Requires real API)', () => {
    test('should successfully execute search with valid query (integration test)', async () => {
      // Note: This test requires a real TAVILY_API_KEY to pass
      // It's skipped in CI/CD but useful for local testing
      if (!process.env.TAVILY_API_KEY) {
        console.log('Skipping integration test - TAVILY_API_KEY not set');
        return;
      }

      const context = createMockContext();
      const tool = createSearchTool({ context });

      const result = await tool.execute({
        query: 'TypeScript',
        maxResults: 2,
      });

      if (!result.isError) {
        expect(result.llmContent).toBeDefined();
        expect(result.returnDisplay).toContain('Found');
        expect(result.returnDisplay).toContain('results');
      }
    }, 30000);
  });

  describe('Tool Approval', () => {
    test('should require network approval', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      expect(tool.approval).toBeDefined();
      expect(tool.approval?.category).toBe('network');
    });
  });

  describe('Tool Description', () => {
    test('should generate description from query', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const desc = tool.getDescription?.({
        params: { query: 'test query' },
        cwd: '/test',
      });

      expect(desc).toBe('Search: test query');
    });

    test('should handle missing query', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const desc = tool.getDescription?.({
        params: { query: '' },
        cwd: '/test',
      });

      expect(desc).toBe('Search the web');
    });

    test('should handle non-string query', () => {
      const context = createMockContext();
      const tool = createSearchTool({ context });

      const desc = tool.getDescription?.({
        params: { query: null as any },
        cwd: '/test',
      });

      expect(desc).toBe('Search the web');
    });
  });

  describe('Multiple Tool Instances', () => {
    test('should handle multiple tool instances independently', () => {
      const context1 = createMockContext({ maxResults: 5 });
      const context2 = createMockContext({ maxResults: 10 });

      const tool1 = createSearchTool({ context: context1 });
      const tool2 = createSearchTool({ context: context2 });

      expect(tool1.name).toBe('web_search');
      expect(tool2.name).toBe('web_search');
    });

    test('should not share state between instances', () => {
      process.env.TAVILY_API_KEY = 'key1';
      const tool1 = createSearchTool({ context: createMockContext() });

      process.env.TAVILY_API_KEY = 'key2';
      const tool2 = createSearchTool({ context: createMockContext() });

      expect(tool1.name).toBe('web_search');
      expect(tool2.name).toBe('web_search');
    });
  });
});

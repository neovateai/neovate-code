import createDebug from 'debug';
import { countTokens } from './utils/tokenCounter';
import {
  COMPACTION_OUTPUT_TOKEN_MAX,
  COMPACTION_TRIGGER_RATIO,
  PRUNE_MINIMUM,
  PRUNE_PROTECTED_TOOLS,
  PRUNE_PROTECT_THRESHOLD,
  PRUNE_PROTECT_TURNS,
} from './constants';
import type { NormalizedMessage, ToolResultPart2 } from './message';

const debug = createDebug('neovate:compression');

// ============================================
// Type Definitions
// ============================================

export interface CompressionConfig {
  compaction: {
    auto: boolean; // Whether to enable auto compression
    outputTokenMax: number; // Reserved output tokens
    autoContinue: boolean; // Auto continue after compression
    triggerRatio: number; // Trigger compression when context usage exceeds this ratio (0-1)
  };
  pruning: {
    enabled: boolean; // Whether to enable pruning
    protectThreshold: number; // Protection threshold (tokens)
    minimumPrune: number; // Minimum prune amount
    protectedTools: string[]; // Protected tool list
    protectTurns: number; // Protected turns
  };
}

interface ModelLimit {
  context: number;
  output: number;
  input?: number;
}

interface TokenUsage {
  input: number;
  output: number;
  cacheRead?: number;
}

export interface PruneResult {
  pruned: boolean;
  prunedCount: number;
  prunedTokens: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if compression is needed (Token overflow detection)
 *
 * Formula: currentInputTokens > context * triggerRatio
 * Triggers when usage exceeds the specified ratio of total context window
 * Example: triggerRatio=0.7 means trigger when using >70% (remaining <30%)
 */
export function isOverflow(
  tokens: TokenUsage,
  modelLimit: ModelLimit,
  config: CompressionConfig,
): boolean {
  if (!config.compaction.auto) {
    return false;
  }

  const context = modelLimit.context;
  if (context === 0) {
    return false;
  }

  // Calculate current input token usage (input + cacheRead)
  const currentInputTokens = tokens.input + (tokens.cacheRead || 0);

  // Calculate compression threshold based on TOTAL context window
  // triggerRatio = 0.7 means: trigger when using >70% (remaining <30%)
  const compressionThreshold = context * config.compaction.triggerRatio;

  const overflow = currentInputTokens > compressionThreshold;

  debug(
    `[isOverflow] currentInputTokens=${currentInputTokens}, context=${context}, triggerRatio=${config.compaction.triggerRatio}, threshold=${compressionThreshold}, overflow=${overflow}`,
  );

  return overflow;
}

// ============================================
// Compression Namespace
// ============================================

export namespace Compression {
  export const DEFAULT_CONFIG: CompressionConfig = {
    compaction: {
      auto: true,
      outputTokenMax: COMPACTION_OUTPUT_TOKEN_MAX,
      autoContinue: true,
      triggerRatio: COMPACTION_TRIGGER_RATIO,
    },
    pruning: {
      enabled: true,
      protectThreshold: PRUNE_PROTECT_THRESHOLD,
      minimumPrune: PRUNE_MINIMUM,
      protectedTools: [...PRUNE_PROTECTED_TOOLS],
      protectTurns: PRUNE_PROTECT_TURNS,
    },
  };

  /**
   * Pruning: Prune historical tool outputs
   *
   * Rules:
   * 1. Traverse messages in reverse order (from newest to oldest)
   * 2. Skip recent N turns of conversation (default 2 turns)
   * 3. Accumulate token count of tool outputs
   * 4. When accumulated tokens > protectThreshold, subsequent tool outputs are marked for pruning
   * 5. Only execute if pruning amount > minimumPrune
   * 6. Stop traversing when encountering already pruned parts
   */
  export function prune(
    messages: NormalizedMessage[],
    config: CompressionConfig,
  ): PruneResult {
    if (!config.pruning.enabled) {
      return { pruned: false, prunedCount: 0, prunedTokens: 0 };
    }

    const { protectThreshold, minimumPrune, protectedTools, protectTurns } =
      config.pruning;

    let totalTokens = 0;
    let prunedTokens = 0;
    const toPrune: ToolResultPart2[] = [];
    let turns = 0;

    // Traverse messages in reverse order
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      // Count conversation turns (user messages count as one turn)
      if (msg.role === 'user') {
        turns++;
      }

      // Check if it's a tool message
      if (msg.role === 'tool' && Array.isArray(msg.content)) {
        // Protect recent N turns
        if (turns < protectTurns) {
          continue;
        }

        for (const part of msg.content as ToolResultPart2[]) {
          if (part.type !== 'tool-result') continue;

          // Skip protected tools
          if (protectedTools.includes(part.toolName)) {
            continue;
          }

          // Skip already pruned parts
          if (part.pruned) {
            // Stop traversing when encountering pruned parts
            break;
          }

          // Estimate token count
          const resultContent =
            typeof part.result?.llmContent === 'string'
              ? part.result.llmContent
              : JSON.stringify(part.result?.llmContent || '');
          const tokenEstimate = countTokens(resultContent);
          totalTokens += tokenEstimate;

          // Only parts exceeding protection threshold are marked for pruning
          if (totalTokens > protectThreshold) {
            prunedTokens += tokenEstimate;
            toPrune.push(part);
          }
        }
      }
    }

    // Only execute pruning if amount exceeds minimum
    if (prunedTokens > minimumPrune) {
      for (const part of toPrune) {
        part.pruned = true;
        part.prunedAt = Date.now();
        // Clear original output content, keep metadata
        if (part.result) {
          part.result = {
            ...part.result,
            llmContent: `[Output pruned at ${new Date(part.prunedAt).toISOString()}]`,
          };
        }
      }

      debug(
        `[prune] Pruned ${toPrune.length} tool outputs, ~${prunedTokens} tokens`,
      );

      return { pruned: true, prunedCount: toPrune.length, prunedTokens };
    }

    return { pruned: false, prunedCount: 0, prunedTokens: 0 };
  }
}

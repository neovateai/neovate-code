// @ts-nocheck
import createDebug from 'debug';
import type { Context } from '../../context';
import { createStableToolKey } from '../../utils/formatToolUse';

const debug = createDebug('takumi:server:tool-approval');

export interface PendingApproval {
  callId: string;
  toolName: string;
  params: Record<string, any>;
  resolve: (approved: boolean) => void;
  timestamp: number;
}

export interface ApprovalMemory {
  proceedOnce: Set<string>;
  proceedAlways: Set<string>;
  proceedAlwaysTool: Set<string>;
}

export interface ToolApprovalConfig {
  maxPendingApprovals?: number;
  maxMemorySize?: number;
}

export class ToolApprovalService {
  private pendingApprovals = new Map<string, PendingApproval>();
  private approvalMemory: ApprovalMemory = {
    proceedOnce: new Set(),
    proceedAlways: new Set(),
    proceedAlwaysTool: new Set(),
  };
  private readonly config: ToolApprovalConfig;
  private isDestroyed = false;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private context: Context,
    config: ToolApprovalConfig = {},
  ) {
    this.config = {
      maxPendingApprovals: 100,
      maxMemorySize: 1000,
      ...config,
    };

    this.setupPeriodicCleanup();
  }

  async shouldApprove(
    toolName: string,
    params: Record<string, any>,
  ): Promise<boolean> {
    this.checkDestroyed();

    const approvalMode = this.context.config.approvalMode || 'default';

    const toolCategory = this.getToolCategory(toolName);

    switch (approvalMode) {
      case 'yolo':
        return false;
      case 'autoEdit':
        return toolCategory === 'command';
      case 'default':
      default:
        return toolCategory !== 'read';
    }
  }

  async requestApproval(
    callId: string,
    toolName: string,
    params: Record<string, any>,
  ): Promise<boolean> {
    this.checkDestroyed();
    debug(`Requesting approval for tool: ${toolName}, callId: ${callId}`);

    // 原子性检查并添加（防止竞态条件）
    if (this.pendingApprovals.has(callId)) {
      debug(`CallId ${callId} already exists, rejecting duplicate request`);
      throw new Error(`Approval request with callId ${callId} already exists`);
    }

    if (this.pendingApprovals.size >= this.config.maxPendingApprovals!) {
      debug(
        `Pending approvals queue is full (${this.config.maxPendingApprovals})`,
      );
      throw new Error('Too many pending approval requests');
    }

    const toolKey = createStableToolKey(toolName, params);
    const toolOnlyKey = toolName;

    if (
      this.approvalMemory.proceedAlways.has(toolKey) ||
      this.approvalMemory.proceedAlwaysTool.has(toolOnlyKey)
    ) {
      debug(`Auto-approved from memory: ${toolName}`);
      return true;
    }

    if (this.approvalMemory.proceedOnce.has(toolKey)) {
      this.approvalMemory.proceedOnce.delete(toolKey);
      debug(`Auto-approved once from memory: ${toolName}`);
      return true;
    }

    const needsApproval = await this.shouldApprove(toolName, params);
    if (!needsApproval) {
      debug(`Tool ${toolName} does not need approval`);
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const pendingApproval: PendingApproval = {
        callId,
        toolName,
        params,
        resolve,
        timestamp: Date.now(),
      };

      this.pendingApprovals.set(callId, pendingApproval);
      debug(
        `Added pending approval: ${callId} (queue size: ${this.pendingApprovals.size})`,
      );
    });
  }

  // 提交审批结果
  submitApproval(
    callId: string,
    approved: boolean,
    option: 'once' | 'always' | 'always_tool' = 'once',
  ): boolean {
    this.checkDestroyed();

    const pendingApproval = this.pendingApprovals.get(callId);
    if (!pendingApproval) {
      debug(`No pending approval found for callId: ${callId}`);
      return false;
    }

    const { toolName, params, resolve } = pendingApproval;
    const toolKey = createStableToolKey(toolName, params);

    if (approved) {
      this.updateApprovalMemory(toolKey, toolName, option);
    }

    this.pendingApprovals.delete(callId);
    resolve(approved);

    debug(
      `Submitted approval: ${callId}, approved: ${approved}, option: ${option}`,
    );
    return true;
  }

  // 取消待审批请求
  cancelApproval(callId: string): boolean {
    this.checkDestroyed();

    const pendingApproval = this.pendingApprovals.get(callId);
    if (!pendingApproval) {
      debug(`No pending approval found for callId: ${callId}`);
      return false;
    }

    this.pendingApprovals.delete(callId);

    // 安全地解析 Promise（防止异常）
    try {
      pendingApproval.resolve(false);
    } catch (error) {
      debug(`Error resolving cancelled approval ${callId}:`, error);
    }

    debug(`Cancelled approval: ${callId}`);
    return true;
  }

  // 清理所有待审批请求
  clearAllPendingApprovals(): number {
    this.checkDestroyed();

    const count = this.pendingApprovals.size;

    // 安全地拒绝所有待审批请求
    for (const [callId, approval] of this.pendingApprovals) {
      try {
        approval.resolve(false);
        debug(`Auto-rejected pending approval: ${callId}`);
      } catch (error) {
        debug(`Error rejecting approval ${callId}:`, error);
      }
    }

    this.pendingApprovals.clear();
    debug(`Cleared ${count} pending approvals`);
    return count;
  }

  // 清理过期的待审批请求
  cleanupStaleApprovals(maxAgeMs: number = 30 * 60 * 1000): number {
    this.checkDestroyed();

    const now = Date.now();
    const staleCallIds: string[] = [];

    for (const [callId, approval] of this.pendingApprovals) {
      if (now - approval.timestamp > maxAgeMs) {
        staleCallIds.push(callId);
      }
    }

    for (const callId of staleCallIds) {
      this.cancelApproval(callId);
    }

    debug(`Cleaned up ${staleCallIds.length} stale approvals`);
    return staleCallIds.length;
  }

  // 清除审批记忆
  clearApprovalMemory(): void {
    this.checkDestroyed();

    this.approvalMemory.proceedOnce.clear();
    this.approvalMemory.proceedAlways.clear();
    this.approvalMemory.proceedAlwaysTool.clear();
    debug('Cleared approval memory');
  }

  // 销毁服务
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    debug('Destroying ToolApprovalService');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.clearAllPendingApprovals();
    this.isDestroyed = true;
  }

  // 设置定期清理过期请求
  private setupPeriodicCleanup(): void {
    // 每5分钟清理一次过期请求
    this.cleanupTimer = setInterval(
      () => {
        if (!this.isDestroyed) {
          try {
            this.cleanupStaleApprovals();
          } catch (error) {
            debug('Error during periodic cleanup:', error);
          }
        }
      },
      5 * 60 * 1000,
    );
  }

  // 更新审批记忆（带限制检查）
  private updateApprovalMemory(
    toolKey: string,
    toolName: string,
    option: 'once' | 'always' | 'always_tool',
  ): void {
    const maxSize = this.config.maxMemorySize!;

    if (option === 'always') {
      if (this.approvalMemory.proceedAlways.size >= maxSize) {
        // 清理最旧的条目（简单的 FIFO）
        const firstKey = this.approvalMemory.proceedAlways
          .values()
          .next().value;
        if (firstKey) {
          this.approvalMemory.proceedAlways.delete(firstKey);
        }
      }
      this.approvalMemory.proceedAlways.add(toolKey);
      debug(`Added to always approve: ${toolKey}`);
    } else if (option === 'always_tool') {
      if (this.approvalMemory.proceedAlwaysTool.size >= maxSize) {
        const firstKey = this.approvalMemory.proceedAlwaysTool
          .values()
          .next().value;
        if (firstKey) {
          this.approvalMemory.proceedAlwaysTool.delete(firstKey);
        }
      }
      this.approvalMemory.proceedAlwaysTool.add(toolName);
      debug(`Added to always approve tool: ${toolName}`);
    }
  }

  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('ToolApprovalService has been destroyed');
    }
  }

  private getToolCategory(
    toolName: string,
  ): 'read' | 'write' | 'command' | 'network' {
    const readTools = ['read', 'ls', 'glob', 'grep'];
    const writeTools = ['write', 'edit'];
    const commandTools = ['bash'];
    const networkTools = ['fetch'];

    if (readTools.includes(toolName)) return 'read';
    if (writeTools.includes(toolName)) return 'write';
    if (commandTools.includes(toolName)) return 'command';
    if (networkTools.includes(toolName)) return 'network';

    return 'command';
  }
}

// 使用 WeakMap 来自动处理 Context 生命周期（修复内存泄漏）
const toolApprovalServices = new WeakMap<Context, ToolApprovalService>();

// 存储所有活跃的服务实例，用于全局清理
const activeServices = new Set<ToolApprovalService>();

export function getToolApprovalService(
  context: Context,
  config?: ToolApprovalConfig,
): ToolApprovalService {
  let service = toolApprovalServices.get(context);
  if (!service) {
    service = new ToolApprovalService(context, config);
    toolApprovalServices.set(context, service);
    activeServices.add(service);
    debug(`Created new ToolApprovalService for context`);
  }
  return service;
}

// 手动清理指定 context 的审批服务
export function cleanupToolApprovalService(context: Context): boolean {
  const service = toolApprovalServices.get(context);
  if (service) {
    service.destroy();
    activeServices.delete(service);
    // WeakMap 会自动清理，但我们可以显式删除
    toolApprovalServices.delete(context);
    debug(`Cleaned up ToolApprovalService for context`);
    return true;
  }
  return false;
}

// 全局清理函数（用于进程退出时）
export function cleanupAllToolApprovalServices(): void {
  debug(`Cleaning up ${activeServices.size} active ToolApprovalServices`);
  for (const service of activeServices) {
    try {
      service.destroy();
    } catch (error) {
      debug('Error destroying service:', error);
    }
  }
  activeServices.clear();
}

// 进程退出时自动清理
process.on('exit', () => {
  cleanupAllToolApprovalServices();
});

process.on('SIGINT', () => {
  cleanupAllToolApprovalServices();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanupAllToolApprovalServices();
  process.exit(0);
});

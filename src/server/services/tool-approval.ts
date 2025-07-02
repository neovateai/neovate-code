import createDebug from 'debug';
import type { Context } from '../../context';

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

    // 启动定期清理过期请求
    this.setupPeriodicCleanup();
  }

  // 检查工具是否需要审批
  async shouldApprove(
    toolName: string,
    params: Record<string, any>,
  ): Promise<boolean> {
    this.checkDestroyed();

    const approvalMode = this.context.config.approvalMode || 'default';

    // 获取工具类别
    const toolCategory = this.getToolCategory(toolName);

    switch (approvalMode) {
      case 'yolo':
        return false; // 全自动模式，不需要审批
      case 'autoEdit':
        return toolCategory === 'command'; // 自动编辑模式，只有命令需要审批
      case 'default':
      default:
        return toolCategory !== 'read'; // 默认模式，读取操作不需要审批
    }
  }

  // 请求工具审批
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

    // 检查队列限制
    if (this.pendingApprovals.size >= this.config.maxPendingApprovals!) {
      debug(
        `Pending approvals queue is full (${this.config.maxPendingApprovals})`,
      );
      throw new Error('Too many pending approval requests');
    }

    // 检查审批记忆
    const toolKey = this.createStableToolKey(toolName, params);
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

    // 检查是否需要审批
    const needsApproval = await this.shouldApprove(toolName, params);
    if (!needsApproval) {
      debug(`Tool ${toolName} does not need approval`);
      return true;
    }

    // 创建待审批项
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
    const toolKey = this.createStableToolKey(toolName, params);

    // 更新审批记忆
    if (approved) {
      this.updateApprovalMemory(toolKey, toolName, option);
    }

    // 清理并解析
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

    // 拒绝并清理
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

    // 拒绝过期的审批请求
    for (const callId of staleCallIds) {
      this.cancelApproval(callId);
    }

    debug(`Cleaned up ${staleCallIds.length} stale approvals`);
    return staleCallIds.length;
  }

  // 获取待审批的工具调用
  getPendingApproval(callId: string): PendingApproval | undefined {
    this.checkDestroyed();
    return this.pendingApprovals.get(callId);
  }

  // 获取所有待审批的工具调用
  getAllPendingApprovals(): PendingApproval[] {
    this.checkDestroyed();
    return Array.from(this.pendingApprovals.values());
  }

  // 获取服务状态
  getStatus() {
    this.checkDestroyed();
    return {
      pendingCount: this.pendingApprovals.size,
      memorySize: {
        proceedOnce: this.approvalMemory.proceedOnce.size,
        proceedAlways: this.approvalMemory.proceedAlways.size,
        proceedAlwaysTool: this.approvalMemory.proceedAlwaysTool.size,
      },
      config: this.config,
      isDestroyed: this.isDestroyed,
    };
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

    // 停止定期清理
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // 清理所有待审批请求
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

  // 创建稳定的工具键（修复 JSON.stringify 问题）
  private createStableToolKey(
    toolName: string,
    params: Record<string, any>,
  ): string {
    // 对参数键进行排序以确保稳定的字符串化结果
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>,
      );

    return `${toolName}:${JSON.stringify(sortedParams)}`;
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

  // 检查服务是否已销毁
  private checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('ToolApprovalService has been destroyed');
    }
  }

  // 获取工具类别
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

    return 'command'; // 默认为命令类型
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

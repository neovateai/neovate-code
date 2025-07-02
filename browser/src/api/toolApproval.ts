import { request } from '@/utils/request';

// 提交工具审批结果
export function submitToolApproval(
  callId: string,
  approved: boolean,
  option: 'once' | 'always' | 'always_tool' = 'once',
): Promise<{ success: boolean }> {
  return request.post('/tool-approval/submit', {
    callId,
    approved,
    option,
  });
}

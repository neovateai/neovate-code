import type {
  AddMcpServerRequest,
  McpOperationResponse,
  McpServerResponse,
  McpServersResponse,
  UpdateMcpServerRequest,
} from '@/types/mcp';
import { request } from '@/utils/request';

// Get server list
export const getMCPServers = (global = false): Promise<McpServersResponse> => {
  return request.get(`/mcp/servers?global=${global}`);
};

// Get single server
export const getMCPServer = (
  name: string,
  global = false,
): Promise<McpServerResponse> => {
  return request.get(
    `/mcp/servers/${encodeURIComponent(name)}?global=${global}`,
  );
};

// Add server
export const addMCPServer = (
  config: AddMcpServerRequest,
): Promise<McpOperationResponse> => {
  return request.post(`/mcp/servers`, config);
};

// Update server
export const updateMCPServer = (
  name: string,
  config: UpdateMcpServerRequest,
): Promise<McpOperationResponse> => {
  return request.patch(`/mcp/servers/${encodeURIComponent(name)}`, config);
};

// Update server with name change support
export const updateMCPServerWithName = async (
  originalName: string,
  newConfig: AddMcpServerRequest,
): Promise<McpOperationResponse> => {
  // If name changed, remove old server and add new one
  if (originalName !== newConfig.name) {
    await removeMCPServer(originalName, newConfig.global);
    return addMCPServer(newConfig);
  }

  // If name unchanged, use regular update
  const { name, ...updateConfig } = newConfig;
  return updateMCPServer(originalName, updateConfig);
};

// Remove server
export const removeMCPServer = (
  name: string,
  global = false,
): Promise<McpOperationResponse> => {
  return request.delete(
    `/mcp/servers/${encodeURIComponent(name)}?global=${global}`,
  );
};

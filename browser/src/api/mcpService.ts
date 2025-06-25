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
  return request.get(`/mcp/servers/${name}?global=${global}`);
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
  return request.patch(`/mcp/servers/${name}`, config);
};

// Remove server
export const removeMCPServer = (
  name: string,
  global = false,
): Promise<McpOperationResponse> => {
  return request.delete(`/mcp/servers/${name}?global=${global}`);
};

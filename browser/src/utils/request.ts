import { message } from 'antd';
import axios from 'axios';

export const request = axios.create({
  baseURL: `/api`,
});

request.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      // 如果返回值 success 为 false，则抛出错误
      if (response.data.success === true) {
        return response.data;
      }

      message.error(response.data.error);
      return Promise.reject(response.data);
    }
    return Promise.reject(response);
  },
  (error) => {
    return Promise.reject(error);
  },
);

// MCP API request adapter
export const mcpRequest = {
  // Handle response interceptor issues for GET requests
  async get(url: string) {
    try {
      const response = await request.get(url);
      return response.data || response;
    } catch (error: any) {
      // If error is caused by interceptor handling but original request was successful
      // The interceptor throws the raw data as error, we use this data directly
      if (error && typeof error === 'object' && !error.response) {
        // This is the data object thrown directly by the interceptor
        return error;
      }
      // Throw other errors normally
      throw error;
    }
  },

  // Other requests use unified request for consistent error handling
  async post(url: string, data: any) {
    const response = await request.post(url, data);
    return response.data || response;
  },

  async patch(url: string, data: any) {
    const response = await request.patch(url, data);
    return response.data || response;
  },

  async delete(url: string) {
    const response = await request.delete(url);
    return response.data || response;
  },
};

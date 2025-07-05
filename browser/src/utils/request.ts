import { message } from 'antd';
import axios from 'axios';
import type { CancelTokenSource } from 'axios';

// 创建一个请求取消管理器
export const requestCancelManager = {
  // 存储活动的请求取消令牌
  activeRequests: new Map<string, CancelTokenSource>(),

  // 添加请求到管理器
  addRequest(requestId: string, source: CancelTokenSource) {
    this.activeRequests.set(requestId, source);
  },

  // 取消指定请求
  cancelRequest(requestId: string) {
    const source = this.activeRequests.get(requestId);
    if (source) {
      source.cancel('用户取消了请求');
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  },

  // 取消所有请求
  cancelAllRequests() {
    this.activeRequests.forEach((source) => {
      source.cancel('用户取消了所有请求');
    });
    this.activeRequests.clear();
  },

  // 请求完成后从管理器中移除
  removeRequest(requestId: string) {
    this.activeRequests.delete(requestId);
  },
};

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
    // 忽略取消请求的错误
    if (axios.isCancel(error)) {
      console.log('Request canceled');
      return Promise.reject({ canceled: true });
    }
    return Promise.reject(error);
  },
);

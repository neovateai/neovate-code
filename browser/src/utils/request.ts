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

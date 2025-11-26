import { message } from 'antd';
import axios from 'axios';

export const request = axios.create({
  baseURL: `/api`,
});

request.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      // If the return value success is false, throw an error
      if (response.data.success === true) {
        return response.data;
      }

      message.error(response.data.message);
      return Promise.reject(response.data);
    }
    return Promise.reject(response);
  },
  (error) => {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error?.code === 'ERR_BAD_RESPONSE') {
      message.error(`Request failed, status code: ${error.response?.status}`);
    } else if (error?.message) {
      message.error(error.message);
    } else {
      message.error('Request error, please try again later');
    }
    return Promise.reject(error);
  },
);

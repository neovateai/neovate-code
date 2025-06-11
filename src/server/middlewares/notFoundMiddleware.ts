import { RequestHandler } from '../types';

export const notFoundMiddleware: RequestHandler = (_req, res, _next) => {
  res.statusCode = 404;
  res.end();
};

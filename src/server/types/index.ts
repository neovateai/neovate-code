import type { FastifyReply, FastifyRequest } from 'fastify';

export * from './app-data';
export * from './server';

export interface TypedRequest<Body = unknown, Query = unknown, Params = unknown>
  extends FastifyRequest {
  body: Body;
  query: Query;
  params: Params;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type TypedReply = FastifyReply;

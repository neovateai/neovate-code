import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Context } from '../types';

export type FastifyRequestHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> | void;

export type FastifyPlugin = (
  fastify: FastifyInstance,
  opts: ServerOptions,
) => Promise<void>;

// 保留旧的类型定义以便兼容
export type NextFunction = () => void;
export type RequestHandler = FastifyRequestHandler;

export interface ServerOptions {
  port: number;
  host: string;
  context: Context;
  prompt: string;
}

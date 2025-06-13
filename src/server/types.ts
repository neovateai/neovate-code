import { IncomingMessage, ServerResponse } from 'node:http';
import { Context } from '../types';

export type NextFunction = () => void;

export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;

export interface ServerOptions {
  port: number;
  host: string;
  context: Context;
  prompt: string;
}

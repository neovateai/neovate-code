import { IncomingMessage, ServerResponse } from 'node:http';

export type NextFunction = () => void;

export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;

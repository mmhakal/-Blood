import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../services/logger';

export interface ExtendedRequest extends Request {
  requestId?: string;
  correlationId?: string;
  startTime?: number;
}

export const requestContextMiddleware = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req-${uuidv4().substring(0, 8)}`;
  const corrId = (req.headers['x-correlation-id'] as string) || reqId;

  req.requestId = reqId;
  req.correlationId = corrId;
  req.startTime = Date.now();

  res.setHeader('x-request-id', reqId);
  res.setHeader('x-correlation-id', corrId);

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const isError = res.statusCode >= 400;

    const logData = {
      request_id: reqId,
      correlation_id: corrId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip || req.socket.remoteAddress
    };

    if (isError) {
      Logger.warn(`HTTP ${req.method} ${req.originalUrl} finished with error status ${res.statusCode}`, logData);
    } else {
      Logger.info(`HTTP ${req.method} ${req.originalUrl} completed`, logData);
    }
  });

  next();
};

export default requestContextMiddleware;

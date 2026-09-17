/**
 * API Contract Standard Middleware (Section 24 & 25)
 * 
 * Enforces:
 * - Uniform response structure: { success, data, error, message, requestId, metadata }
 * - Contextual headers: requestId, tenantId, organizationId, branchId, userId, timestamp, apiVersion
 * - Deprecation headers (Sunset, Deprecation) for versioned APIs
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StandardApiResponse } from '../types/moduleContracts';

export interface ContractRequest extends Request {
  requestId: string;
  startTime: number;
  apiVersion: string;
  context: {
    tenantId?: string;
    organizationId?: string;
    branchId?: string;
    userId?: string;
    apiVersion: string;
    timestamp: string;
  };
}

/**
 * Middleware that decorates incoming requests with context and adds res.sendContractResponse.
 */
export function apiContractMiddleware(apiVersion = 'v1') {
  return (req: Request, res: Response, next: NextFunction) => {
    const cReq = req as ContractRequest;
    cReq.requestId = (req.headers['x-request-id'] as string) || `req-${uuidv4().substring(0, 10)}`;
    cReq.startTime = Date.now();
    cReq.apiVersion = apiVersion;

    const user = (req as any).user;
    cReq.context = {
      tenantId: user?.lab_id || (req.headers['x-lab-id'] as string) || undefined,
      organizationId: user?.organization_id || undefined,
      branchId: user?.branch_id || (req.query?.branch_id as string) || undefined,
      userId: user?.id || undefined,
      apiVersion,
      timestamp: new Date().toISOString()
    };

    res.setHeader('X-Request-Id', cReq.requestId);
    res.setHeader('X-API-Version', apiVersion);

    // Standard helper for sending contracted responses
    (res as any).sendContract = <T = any>(data: T, message?: string, statusCode = 200) => {
      const durationMs = Date.now() - cReq.startTime;
      const response: StandardApiResponse<T> = {
        success: true,
        data,
        message,
        requestId: cReq.requestId,
        metadata: {
          ...cReq.context,
          durationMs
        }
      };
      return res.status(statusCode).json(response);
    };

    // Standard helper for sending error contracted responses
    (res as any).sendContractError = (errorCode: string, errorMessage: string, details?: any, statusCode = 400) => {
      const durationMs = Date.now() - cReq.startTime;
      const response: StandardApiResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details
        },
        requestId: cReq.requestId,
        metadata: {
          ...cReq.context,
          durationMs
        }
      };
      return res.status(statusCode).json(response);
    };

    next();
  };
}

export default apiContractMiddleware;

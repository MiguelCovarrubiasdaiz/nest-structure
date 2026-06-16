import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '@shared/domain/domain.exception';

export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = this.toBody(error, req.url);

    if (body.statusCode >= 500) {
      this.logger.error(`[${body.code}] ${body.message}`, (error as Error)?.stack);
    } else {
      this.logger.warn(`[${body.code}] ${body.message} → ${req.method} ${req.url}`);
    }

    res.status(body.statusCode).json(body);
  }

  private toBody(error: unknown, path: string): ErrorResponseBody {
    const base = { path, timestamp: new Date().toISOString() };

    // 1. Domain exception → carries its own code + status
    if (error instanceof DomainException) {
      return {
        ...base,
        statusCode: error.httpStatus,
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    // 2. Nest HttpException (ValidationPipe, ParseUUIDPipe, BadRequest, etc.)
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const status = error.getStatus();
      const message =
        typeof response === 'string'
          ? response
          : ((response as Record<string, unknown>).message as string) ?? error.message;
      return {
        ...base,
        statusCode: status,
        code: this.codeFromStatus(status),
        message: Array.isArray(message) ? message.join(', ') : message,
        details: typeof response === 'object' ? (response as Record<string, unknown>) : undefined,
      };
    }

    // 3. Unknown error
    const err = error as Error;
    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: err?.message ?? 'Internal server error',
    };
  }

  private codeFromStatus(status: number): string {
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
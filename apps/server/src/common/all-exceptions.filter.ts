import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly allowedOrigins: string[]) {}

  private getAllowedOrigin(origin: string | undefined): string | undefined {
    if (!origin) return undefined;
    if (!this.allowedOrigins?.length) return origin;
    return this.allowedOrigins.includes(origin) ? origin : undefined;
  }

  private setCorsHeaders(response: Response, origin?: string): void {
    if (!origin) return;
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const origin = this.getAllowedOrigin(request.headers.origin as string | undefined);

    this.setCorsHeaders(response, origin);

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    const message = typeof responseBody === 'string'
      ? responseBody
      : (responseBody as any)?.message ?? 'Internal server error';

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        message,
      });
    }
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaErrorEnum } from '../enum/prismaError';
// Use the official Prisma client package for typings. Adjusted to avoid referencing a generated
// client path that may not exist in some setups (pre-generated or different output dirs).
import { Prisma } from '../../generated/prisma/client';

/**
 * Forme minimale de l'erreur brute remontée par l'adaptateur (mariadb) et
 * exposée par Prisma dans `meta.driverAdapterError` — non typée par Prisma.
 */
interface DriverAdapterError {
  cause?: {
    constraint?: {
      index?: string;
      fields?: string[];
    };
  };
}

/**
 * Exception filter that handles Prisma client exceptions
 *
 * This filter catches PrismaClientKnownRequestError exceptions thrown by Prisma
 * and converts them into appropriate HTTP responses with meaningful error messages.
 * It maps Prisma error codes to HTTP status codes and provides custom error codes
 * for better client-side error handling.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  /**
   * Logger instance for this filter
   */
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  /**
   * Handles Prisma client exceptions and transforms them into HTTP responses
   *
   * @param exception The caught Prisma exception
   * @param host The arguments host for accessing the HTTP context
   *
   * This method:
   * 1. Extracts the HTTP response object from the context
   * 2. Maps Prisma error codes to appropriate HTTP status codes
   * 3. Generates meaningful error messages based on the exception details
   * 4. Returns a standardized error response with status code, error code, and message
   */
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = 'internal_server_error';
    let message: string = 'Internal server Error';

    const rawModelName = exception.meta?.modelName;
    const modelName =
      typeof rawModelName === 'string' ? rawModelName : 'inconnue';
    const driverError = exception.meta?.driverAdapterError as
      | DriverAdapterError
      | undefined;

    switch (exception.code as PrismaErrorEnum) {
      // Handle unique constraint violations (e.g., duplicate email)
      case PrismaErrorEnum.UniqueConstraintFailed: {
        status = HttpStatus.CONFLICT;
        message = `Conflict unicity key : ${driverError?.cause?.constraint?.index ?? 'inconnu'} for table: ${modelName}`;
        errorCode = 'unique constraint is violated';
        break;
      }

      // Handle foreign key constraint failures (e.g., invalid relation)
      case PrismaErrorEnum.ForeignKeyConstraintFailed: {
        status = HttpStatus.BAD_REQUEST;
        message = `Bad payload with table : ${modelName} for col: ${driverError?.cause?.constraint?.fields?.join(', ') ?? 'inconnu'}`;
        errorCode = 'foreign key constraint is violated';
        break;
      }

      // Handle record not found errors
      case PrismaErrorEnum.RecordDoesNotExist: {
        status = HttpStatus.NOT_FOUND;
        message = `record not found for table ${modelName}`;
        errorCode = 'record does not exist in the database';
        break;
      }

      default:
        // Log unhandled Prisma errors with default 500 error code
        this.logger.error(exception.code);
        this.logger.error(exception.meta);
        break;
    }

    Logger.error(message);

    // Return standardized error response
    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
    });
  }
}

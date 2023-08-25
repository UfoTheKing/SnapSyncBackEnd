import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';
import * as yup from 'yup';
import { MissingParamsException } from '@/exceptions/MissingParamsException';
const {
  ValidationError,
  NotFoundError,
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError,
} = require('objection');

const errorMiddleware = (
  error:
    | MissingParamsException
    | HttpException
    | yup.ValidationError
    | typeof ValidationError
    | typeof NotFoundError
    | typeof DBError
    | typeof ConstraintViolationError
    | typeof UniqueViolationError
    | typeof NotNullViolationError
    | typeof ForeignKeyViolationError
    | typeof CheckViolationError
    | typeof DataError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    var status = 500;
    var message = 'Something went wrong';
    var data = null;
    if (error instanceof yup.ValidationError) {
      status = 422;
      if (error.errors) {
        message = error.errors[0] ? error.errors[0] : '';
        message += error.errors.length > 1 ? ` and ${error.errors.length - 1} more` : '';
      } else {
        message = error.message;
      }
    } else if (error instanceof ValidationError) {
      switch (error.type) {
        case 'ModelValidation':
          status = 400;
          message = error.message;
          break;
        case 'RelationExpression':
          status = 400;
          message = error.message;
          break;
        case 'UnallowedRelation':
          status = 400;
          message = error.message;
          break;
        case 'InvalidGraph':
          status = 400;
          message = error.message;
          break;
        default:
          status = 500;
          message = error.message;
          break;
      }
    } else if (error instanceof NotFoundError) {
      message = error.message;
      status = 404;
    } else if (error instanceof UniqueViolationError) {
      message = error.message;
      status = 409;
    } else if (error instanceof NotNullViolationError) {
      message = error.message;
      status = 400;
    } else if (error instanceof ForeignKeyViolationError) {
      message = error.message;
      status = 409;
    } else if (error instanceof CheckViolationError) {
      message = error.message;
      status = 400;
    } else if (error instanceof DataError) {
      message = error.message;
      status = 400;
    } else if (error instanceof DBError) {
      message = error.message;
      status = 500;
    } else if (error instanceof MissingParamsException) {
      message = error.message;
      status = 400;
    } else {
      status = error.status || 500;
      message = error.message || 'Something went wrong';
      data = error.data || null;
    }

    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}, Stack:: ${error.stack}`);
    let errorResponse = {};

    if (data) {
      errorResponse = {
        status,
        message,
        data,
      };
    } else {
      errorResponse = {
        status,
        message,
      };
    }

    return res.status(status).json(errorResponse);
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;

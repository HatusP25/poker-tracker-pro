import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ValidationError } from '../utils/validators';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    }

    // Unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A record with this value already exists',
      });
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid reference to related record',
      });
    }
  }

  // Generic "not found" errors
  if (err.message.includes('not found')) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

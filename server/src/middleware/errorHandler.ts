import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ValidationError } from '../utils/validators';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log errors with context
  const errorLog = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, log to console (Railway captures this)
    console.error('Error occurred:', JSON.stringify(errorLog));
  } else {
    console.error('Error:', err);
  }

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

    // Connection error
    if (err.code === 'P1001') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Database connection failed',
      });
    }
  }

  // Prisma initialization errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database service is temporarily unavailable',
    });
  }

  // Generic "not found" errors
  if (err.message.includes('not found')) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
  }

  // Default error - hide details in production
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

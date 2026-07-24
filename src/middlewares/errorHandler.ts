import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Fallback for unhandled internal exceptions (shielding from client)
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
};

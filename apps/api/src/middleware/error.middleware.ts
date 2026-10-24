import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiResponse } from "@repolens/shared";

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      meta: { timestamp }
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload or parameters",
        details: err.format()
      },
      meta: { timestamp }
    });
    return;
  }

  console.error("[Unhandled Error]", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "An internal server error occurred" : err.message
    },
    meta: { timestamp }
  });
}

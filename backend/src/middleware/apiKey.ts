
import { Request, Response, NextFunction } from "express";

export function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expectedApiKey = process.env.API_KEY;
  const providedApiKey = req.header("X-API-Key");

  if (!expectedApiKey) {
    res.status(500).json({
      error: "server configuration error",
    });
    return;
  }

  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    res.status(401).json({
      error: "unauthorized",
    });
    return;
  }

  next();
}

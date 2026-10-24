import { Request, Response } from "express";
import { isDatabaseConnected } from "../../database/connection.js";
import type { ApiResponse } from "@repolens/shared";

export class HealthController {
  public static getHealth(_req: Request, res: Response<ApiResponse>): void {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "0.1.0"
      }
    });
  }

  public static getReady(_req: Request, res: Response<ApiResponse>): void {
    const dbReady = isDatabaseConnected();
    const isReady = dbReady;

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        ready: isReady,
        checks: {
          database: dbReady ? "connected" : "disconnected"
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
}

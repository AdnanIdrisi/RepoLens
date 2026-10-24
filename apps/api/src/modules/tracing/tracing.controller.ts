import { Request, Response, NextFunction } from "express";
import { TracingService } from "./tracing.service.js";
import { TraceRequestSchema } from "@repolens/shared";

export class TracingController {
  private tracingService: TracingService;

  constructor(tracingService?: TracingService) {
    this.tracingService = tracingService || new TracingService();
  }

  public listRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const routes = await this.tracingService.listRoutes(repositoryId);
      res.json({
        success: true,
        data: routes
      });
    } catch (error) {
      next(error);
    }
  };

  public traceFlow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const parsedBody = TraceRequestSchema.parse(req.body);

      const result = await this.tracingService.traceFlow(repositoryId, parsedBody);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public indexRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const result = await this.tracingService.discoverAndIndexRoutes(repositoryId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from "express";
import { ImpactService } from "./impact.service.js";
import { ImpactRequestSchema } from "@repolens/shared";

export class ImpactController {
  private impactService: ImpactService;

  constructor(impactService?: ImpactService) {
    this.impactService = impactService || new ImpactService();
  }

  public analyzeImpact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const parsedBody = ImpactRequestSchema.parse(req.body);

      const report = await this.impactService.analyzeImpact(repositoryId, parsedBody);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from "express";
import { RetrievalService } from "./retrieval.service.js";
import { SearchRequestSchema } from "@repolens/shared";
import { CodeChunkModel } from "./models/code-chunk.model.js";

export class RetrievalController {
  private retrievalService: RetrievalService;

  constructor(retrievalService?: RetrievalService) {
    this.retrievalService = retrievalService || new RetrievalService();
  }

  public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const parsedBody = SearchRequestSchema.parse(req.body);

      const response = await this.retrievalService.search(repositoryId, parsedBody);
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      next(error);
    }
  };

  public indexChunks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const result = await this.retrievalService.indexChunks(repositoryId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const totalChunks = await CodeChunkModel.countDocuments({ repositoryId });
      const embeddedChunks = await CodeChunkModel.countDocuments({
        repositoryId,
        embedding: { $exists: true, $ne: [] }
      });

      res.json({
        success: true,
        data: {
          repositoryId,
          totalChunks,
          embeddedChunks,
          isSearchReady: totalChunks > 0
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

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
      const rawInput =
        req.method === "GET"
          ? {
              query: (req.query.query as string) || (req.query.q as string) || "",
              matchType: req.query.matchType || "hybrid",
              limit: req.query.limit ? Number(req.query.limit) : 10,
              path: (req.query.path as string) || undefined,
              symbolKinds: req.query.symbolKinds
                ? Array.isArray(req.query.symbolKinds)
                  ? (req.query.symbolKinds as string[])
                  : [req.query.symbolKinds as string]
                : req.query.kind && req.query.kind !== "all"
                ? [req.query.kind as string]
                : undefined
            }
          : req.body;

      const parsedBody = SearchRequestSchema.parse(rawInput);

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

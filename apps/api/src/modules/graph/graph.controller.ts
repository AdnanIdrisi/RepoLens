import { Request, Response, NextFunction } from "express";
import { GraphService } from "./graph.service.js";
import { z } from "zod";
import type { ApiResponse, GraphEdgeKind, GraphNodeKind } from "@repolens/shared";

const GraphQuerySchema = z.object({
  rootNodeId: z.string().optional(),
  depth: z.coerce.number().int().min(1).max(4).default(1),
  edgeKinds: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()) as GraphEdgeKind[])
    .optional(),
  nodeKinds: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()) as GraphNodeKind[])
    .optional(),
  scope: z.enum(["all", "neighborhood"]).default("neighborhood"),
  limit: z.coerce.number().int().min(1).max(300).default(100)
});

const SymbolSearchQuerySchema = z.object({
  query: z.string().default(""),
  kind: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export class GraphController {
  private graphService: GraphService;

  constructor(graphService?: GraphService) {
    this.graphService = graphService || new GraphService();
  }

  public getGraph = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const options = GraphQuerySchema.parse(req.query);

      const graphData = await this.graphService.getGraph(repositoryId, options);

      res.status(200).json({
        success: true,
        data: graphData,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public searchSymbols = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const { query, kind, limit } = SymbolSearchQuerySchema.parse(req.query);

      const symbols = await this.graphService.searchSymbols(repositoryId, query, kind, limit);

      res.status(200).json({
        success: true,
        data: symbols,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public getSymbol = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id, symbolId } = req.params;
      const symbol = await this.graphService.getSymbol(id, symbolId);

      res.status(200).json({
        success: true,
        data: symbol,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public triggerIndex = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const result = await this.graphService.indexRepositoryGraph(repositoryId);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };
}

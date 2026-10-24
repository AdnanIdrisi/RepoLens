import { Request, Response, NextFunction } from "express";
import { FilesService } from "./files.service.js";
import { z } from "zod";
import type { ApiResponse } from "@repolens/shared";

const FileContentQuerySchema = z.object({
  startLine: z.coerce.number().int().min(1).optional(),
  endLine: z.coerce.number().int().min(1).optional()
});

export class FilesController {
  private filesService: FilesService;

  constructor(filesService?: FilesService) {
    this.filesService = filesService || new FilesService();
  }

  public getFile = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      // Express captures wildcard path
      const rawPath = req.params[0] || (req.params.path as string);

      const query = FileContentQuerySchema.parse(req.query);
      const result = await this.filesService.getFileContent(repositoryId, rawPath, query);

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

import { Request, Response, NextFunction } from "express";
import { RepositoryService } from "./repository.service.js";
import {
  RegisterRepositoryBodySchema,
  ListFilesQuerySchema,
  RepositoryIdParamSchema,
  JobIdParamSchema
} from "./repository.schema.js";
import type { ApiResponse } from "@repolens/shared";

export class RepositoryController {
  private repositoryService: RepositoryService;

  constructor(repositoryService?: RepositoryService) {
    this.repositoryService = repositoryService || new RepositoryService();
  }

  public registerRepository = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedBody = RegisterRepositoryBodySchema.parse(req.body);
      const ownerId = (req.headers["x-user-id"] as string) || "anonymous";

      const result = await this.repositoryService.registerRepository(
        validatedBody.url,
        validatedBody.ref,
        ownerId
      );

      res.status(202).json({
        success: true,
        data: {
          repository: result.repository,
          jobId: result.job._id.toString()
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public listRepositories = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ownerId = (req.headers["x-user-id"] as string) || "anonymous";
      const repositories = await this.repositoryService.listRepositories(ownerId);

      res.status(200).json({
        success: true,
        data: repositories,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public getRepository = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = RepositoryIdParamSchema.parse(req.params);
      const repository = await this.repositoryService.getRepository(id);

      res.status(200).json({
        success: true,
        data: repository,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public getJob = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobId } = JobIdParamSchema.parse(req.params);
      const job = await this.repositoryService.getJob(jobId);

      res.status(200).json({
        success: true,
        data: job,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public cancelJob = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobId } = JobIdParamSchema.parse(req.params);
      const job = await this.repositoryService.cancelJob(jobId);

      res.status(200).json({
        success: true,
        data: job,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public listFiles = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = RepositoryIdParamSchema.parse(req.params);
      const query = ListFilesQuerySchema.parse(req.query);

      const result = await this.repositoryService.getFiles(id, query);

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

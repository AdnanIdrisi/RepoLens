import { z } from "zod";

export const RegisterRepositoryBodySchema = z.object({
  url: z.string().url("Must be a valid URL"),
  ref: z.string().optional().default("main")
});

export const ListFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(["discovered", "fetched", "excluded", "failed"]).optional(),
  language: z.string().optional(),
  search: z.string().optional()
});

export const RepositoryIdParamSchema = z.object({
  id: z.string().min(1, "Repository ID is required")
});

export const JobIdParamSchema = z.object({
  jobId: z.string().min(1, "Job ID is required")
});

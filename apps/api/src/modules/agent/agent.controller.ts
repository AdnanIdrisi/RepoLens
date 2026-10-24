import { Request, Response, NextFunction } from "express";
import { AgentService } from "./agent.service.js";
import { AgentChatRequestSchema } from "@repolens/shared";

export class AgentController {
  private agentService: AgentService;

  constructor(agentService?: AgentService) {
    this.agentService = agentService || new AgentService();
  }

  public chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const parsedBody = AgentChatRequestSchema.parse(req.body);
      const isEventStream = req.headers.accept?.includes("text/event-stream");

      if (isEventStream) {
        // SSE Streaming setup
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const sendEvent = (event: string, data: unknown) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
          const result = await this.agentService.chat(
            repositoryId,
            parsedBody.message,
            parsedBody.conversationId,
            (eventType, data) => {
              sendEvent(eventType, data);
            }
          );

          sendEvent("done", result);
          res.end();
        } catch (streamError) {
          sendEvent("error", {
            message: streamError instanceof Error ? streamError.message : "Agent execution error"
          });
          res.end();
        }
      } else {
        // Standard JSON response
        const result = await this.agentService.chat(
          repositoryId,
          parsedBody.message,
          parsedBody.conversationId
        );

        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      next(error);
    }
  };

  public getConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversationId = req.params.conversationId;
      const conv = await this.agentService.getConversation(conversationId);
      res.json({
        success: true,
        data: conv
      });
    } catch (error) {
      next(error);
    }
  };

  public listConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repositoryId = req.params.id;
      const list = await this.agentService.listConversations(repositoryId);
      res.json({
        success: true,
        data: list
      });
    } catch (error) {
      next(error);
    }
  };
}

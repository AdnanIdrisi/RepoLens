import { Router } from "express";
import { AgentController } from "./agent.controller.js";

export function createAgentRouter(controller?: AgentController): Router {
  const router = Router();
  const agentController = controller || new AgentController();

  // POST /api/repositories/:id/agent/chat (supports JSON or SSE streaming)
  router.post("/repositories/:id/agent/chat", agentController.chat);

  // GET /api/repositories/:id/agent/conversations
  router.get("/repositories/:id/agent/conversations", agentController.listConversations);

  // GET /api/repositories/:id/agent/conversations/:conversationId
  router.get(
    "/repositories/:id/agent/conversations/:conversationId",
    agentController.getConversation
  );

  return router;
}

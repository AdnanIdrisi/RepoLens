import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp();

describe("API Basic Health Endpoints", () => {
  it("GET /api/health returns 200 with ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.uptimeSeconds).toBeTypeOf("number");
  });

  it("GET /api/ready reports dependency readiness", async () => {
    const res = await request(app).get("/api/ready");
    // Without MongoDB running in test, it will return 503 or 200 with checks
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("checks");
  });
});

import type { FastifyInstance } from "fastify";
import {
  handleWebhookVerification,
  handleWebhookEvent,
} from "./whatsapp.handler";

/**
 * WhatsApp webhook routes.
 *
 * GET  /webhook/whatsapp — Meta verification challenge (subscription setup)
 * POST /webhook/whatsapp — Incoming webhook events
 */
export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  // ── GET: Webhook Verification ──────────────────────────
  // Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge
  // to verify the webhook URL during subscription setup.
  app.get("/whatsapp", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          "hub.mode": { type: "string" },
          "hub.verify_token": { type: "string" },
          "hub.challenge": { type: "string" },
        },
        required: ["hub.mode", "hub.verify_token", "hub.challenge"],
      },
    },
    handler: handleWebhookVerification,
  });

  // ── POST: Incoming Webhook Events ──────────────────────
  // Meta sends POST requests with signed payloads containing
  // message events, status updates, etc.
  app.post("/whatsapp", {
    handler: handleWebhookEvent,
  });
}

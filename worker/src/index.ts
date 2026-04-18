import { Hono } from "hono";
import type { Env } from "./env.js";
import { mountRest } from "./transports/rest.js";

const app = new Hono<{ Bindings: Env }>();
app.get("/ping", (c) => c.json({ ok: true }));
mountRest(app);

export default app;

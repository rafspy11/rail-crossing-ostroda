import { Router, Request, Response } from "express";
import { getStatus } from "../services/timetable";
import { addToken, suppressForClosure } from "../services/subscribers";
import { runNotifyTick } from "../services/notify";

const router = Router();

router.get("/status", getStatus);

router.post("/register-token", (req: Request, res: Response) => {
  const { token } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "Missing token" });
  }
  addToken(token);
  res.json({ ok: true });
});

router.post("/suppress-notification", (req: Request, res: Response) => {
  const { token, closureId } = req.body ?? {};
  if (typeof token !== "string" || typeof closureId !== "string") {
    return res.status(400).json({ error: "Missing token or closureId" });
  }
  suppressForClosure(token, closureId);
  res.json({ ok: true });
});

// Wywoływane przez zewnętrzny cron (np. cron-job.org) co ok. 1 minutę.
// Jeśli NOTIFY_TICK_SECRET jest ustawiony, wymagany jest pasujący ?secret= w URLu.
router.get("/notify-tick", async (req: Request, res: Response) => {
  const requiredSecret = process.env.NOTIFY_TICK_SECRET;
  if (requiredSecret && req.query.secret !== requiredSecret) {
    return res.status(403).json({ error: "Invalid secret" });
  }

  try {
    const result = await runNotifyTick();
    res.json(result);
  } catch (err) {
    console.error("Notify tick error:", err);
    res.status(500).json({ error: "Notify tick error", details: String(err) });
  }
});

export default router;

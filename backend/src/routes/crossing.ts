import { Router } from "express";
import { getStatus } from "../services/timetable";

const router = Router();

router.get("/status", getStatus);
// router.get("/schedule", getSchedule);

export default router;
import { Router } from "express";
import { getStatus } from "../services/timetable";

const router = Router();

router.get("/status", getStatus);
// router.get("/stations", getStationsList);
export default router;
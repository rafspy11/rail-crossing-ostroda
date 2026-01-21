import { Router } from "express";
import { getStatus } from "../services/timetable";
import { findStation } from "../services/timetable";

const router = Router();

router.get("/status", getStatus);
// router.get("/stations", getStationsList);
router.get("/station-search", findStation);

export default router;
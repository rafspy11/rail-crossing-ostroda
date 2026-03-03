import express from "express";
import cors from "cors";
import crossingRoutes from "./routes/crossing";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/crossing", crossingRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API running on", port));
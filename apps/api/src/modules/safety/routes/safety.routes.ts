import { Router, type Router as ExpressRouter } from "express";
import { assessSafetyController } from "../controllers/safety.controller.js";

const safetyRouter: ExpressRouter = Router();

safetyRouter.post("/assess", assessSafetyController);

export { safetyRouter };
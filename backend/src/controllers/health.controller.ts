// src/controllers/health.controller.ts

import { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service";

export function healthCheck(req: Request, res: Response) {
  const status = getHealthStatus();
  return res.status(200).json(status);
}
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";

export const authenticate = (
  req: Request & {
    user?: { user_id: number; role: string; permissions: number[] };
  },
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized Access: No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Unauthorized Access: Invalid Token" });
  }
};

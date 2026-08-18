import { Request, Response, NextFunction } from "express";
import { getUserPermission } from "../models/permission.model.js";

export const authorize = (options: {
  permissions?: number[];
  roles?: string[];
  freshCheck?: boolean;
}) => {
  return async (
    req: Request & {
      user?: { user_id: number; role: string; permissions: number[] };
    },
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized Access" });
    }

    const { permissions: requiredPermissions, roles: allowedRoles } = options;

    if (!requiredPermissions?.length && !allowedRoles?.length) {
      console.error(
        "Authorization Error: authorize() called without permissions or roles",
      );
      return res.status(500).json({ message: "Authorization check failed" });
    }

    try {
      const hasRole = allowedRoles?.includes(req.user.role) ?? false;

      let hasPermission = false;

      if (requiredPermissions?.length) {
        const userPermissions = await getUserPermission(req.user.user_id);

        hasPermission = requiredPermissions.some((p) =>
          userPermissions.includes(p),
        );
      }

      if (!hasPermission && !hasRole) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Authorization Error:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

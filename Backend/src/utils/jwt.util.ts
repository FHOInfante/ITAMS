import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (payload: {
  user_id: number;
  role: string;
  permissions: number[];
}): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.jwt.secret, options);
};

export const verifyToken = (
  token: string,
): { user_id: number; role: string; permissions: number[] } => {
  return jwt.verify(token, env.jwt.secret) as {
    user_id: number;
    role: string;
    permissions: number[];
  };
};

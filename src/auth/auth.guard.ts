import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { validateToken } from "@kinde/jwt-validator";
import { jwtDecode } from "jwt-decode";

type KindeRole = string | { id?: string; key?: string; name?: string };

type KindeTokenPayload = {
  role?: string;
  roles?: KindeRole[];
  [claim: string]: unknown;
};

const toRoleKey = (role: KindeRole): string | null => {
  if (typeof role === "string" && role.length > 0) {
    return role;
  }

  if (role && typeof role === "object") {
    return role.key ?? role.name ?? role.id ?? null;
  }

  return null;
};

const getKindeRoles = (payload: KindeTokenPayload): string[] => {
  const rawRoles = payload.roles ?? payload["https://kinde.com/roles"];

  if (!Array.isArray(rawRoles)) {
    return payload.role ? [payload.role] : [];
  }

  return rawRoles
    .map(toRoleKey)
    .filter((role): role is string => Boolean(role));
};

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authHeader.substring(7);

    try {
      const result = await validateToken({
        token,
        domain: process.env.KINDE_ISSUER_URL!,
      });

      if (!result.valid) {
        throw new UnauthorizedException("Invalid token");
      }

      const payload = jwtDecode<KindeTokenPayload>(token);
      const roles = getKindeRoles(payload);

      request.user = {
        ...payload,
        roles,
        role: payload.role ?? roles[0] ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

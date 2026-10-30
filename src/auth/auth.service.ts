import { validateToken } from "@kinde/jwt-validator";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { jwtDecode } from "jwt-decode";
import { getDatabase } from "src/db/database";
import { users } from "src/db/users/schema";
import { workspaces } from "src/db/workspace/schema";

type UserRole = "admin" | "sales_rep";

type KindeRole = string | { id?: string; key?: string; name?: string };

type KindeTokenPayload = {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  role?: string;
  roles?: KindeRole[];
  [claim: string]: unknown;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async syncKindeUser(authorization?: string) {
    const token = this.readBearerToken(authorization);
    const domain = process.env.KINDE_ISSUER_URL;

    if (!domain) {
      throw new InternalServerErrorException("KINDE_ISSUER_URL is missing");
    }

    const validation = await validateToken({ token, domain });
    if (!validation.valid) {
      throw new UnauthorizedException("Invalid Kinde token");
    }

    const payload = jwtDecode<KindeTokenPayload>(token);
    const profile = await this.fetchKindeProfile(domain, token);
    const email = this.readEmail(profile, payload);

    if (!email) {
      throw new UnauthorizedException("Kinde profile is missing an email");
    }

    const existingUser = await this.findUserByEmail(email);
    const name = this.readName(profile, payload);
    const workspace = await this.resolveUserWorkspace({
      workspaceId: existingUser?.workspace_id,
      name: existingUser?.name || name || email,
      email,
      defaultLanguage: this.readLanguage(profile, payload),
    });

    if (existingUser) {
      if (existingUser.workspace_id !== workspace.id) {
        try {
          await getDatabase()
            .update(users)
            .set({ workspaceId: workspace.id })
            .where(eq(users.id, existingUser.id));
        } catch (error) {
          throw new InternalServerErrorException(
            `user exist — ${workspace.message} — failed to link workspace — ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return {
        message: `user exist — ${workspace.message}`,
        id: existingUser.id,
        workspace_id: workspace.id,
        workspaceId: workspace.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
      };
    }

    return this.insertKindeUser(domain, token, payload, email, name, workspace);
  }

  private readBearerToken(authorization?: string) {
    const header = authorization?.trim();
    if (!header) {
      throw new UnauthorizedException(
        "Missing Authorization header — send Authorization: Bearer <access_token>",
      );
    }

    let token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? header;
    while (token.match(/^Bearer\s+/i)) {
      token = token.replace(/^Bearer\s+/i, "").trim();
    }

    if (!token || token.includes(" ")) {
      throw new UnauthorizedException(
        "Invalid Authorization header — expected 'Bearer <access_token>'",
      );
    }

    return token;
  }

  private async findUserByEmail(email: string) {
    const [data] = await getDatabase()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        workspace_id: users.workspaceId,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return data ?? null;
  }

  private async insertKindeUser(
    domain: string,
    token: string,
    payload: KindeTokenPayload,
    email: string,
    name: string | null,
    workspace: { id: string; message: string },
  ) {
    const roles = await this.getKindeRoles(domain, token, payload);

    try {
      const [data] = await getDatabase()
        .insert(users)
        .values({
          workspaceId: workspace.id,
          email,
          name,
          role: this.toUserRole(roles),
        })
        .returning({
          id: users.id,
          workspace_id: users.workspaceId,
          email: users.email,
          name: users.name,
          role: users.role,
          created_at: users.createdAt,
        });

      if (!data) {
        throw new InternalServerErrorException(
          `User insert returned no row — ${workspace.message}. Check users table RLS and the service-role key.`,
        );
      }

      return {
        ...data,
        message: workspace.message,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.findUserByEmail(email);
        if (!existing?.id) {
          throw new UnauthorizedException(
            `user exist — ${workspace.message} — but no user id was found for ${email}`,
          );
        }

        return {
          message: `user exist — ${workspace.message}`,
          id: existing.id,
          workspace_id: existing.workspace_id ?? workspace.id,
          workspaceId: existing.workspace_id ?? workspace.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
        };
      }
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to insert user — ${workspace.message} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async fetchKindeProfile(
    domain: string,
    token: string,
  ): Promise<Record<string, unknown>> {
    const profileResponse = await fetch(`${domain}/oauth2/v2/user_profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      this.logger.warn(
        `Kinde profile request failed: ${profileResponse.status} ${profileResponse.statusText}`,
      );
      return {};
    }

    return (await profileResponse.json()) as Record<string, unknown>;
  }

  private async getKindeRoles(
    domain: string,
    token: string,
    payload: KindeTokenPayload,
  ): Promise<unknown[]> {
    const tokenRoles = this.rolesFromToken(payload);

    try {
      const rolesResponse = await fetch(`${domain}/account_api/v1/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!rolesResponse.ok) {
        this.logger.warn(
          `Kinde roles request failed: ${rolesResponse.status}. Using token roles instead.`,
        );
        return tokenRoles;
      }

      const rolesData = (await rolesResponse.json()) as { roles?: unknown[] };
      return Array.isArray(rolesData.roles) ? rolesData.roles : tokenRoles;
    } catch (error) {
      this.logger.warn(
        `Kinde roles request errored: ${error instanceof Error ? error.message : String(error)}`,
      );
      return tokenRoles;
    }
  }

  private rolesFromToken(payload: KindeTokenPayload): unknown[] {
    const rawRoles = payload.roles ?? payload["https://kinde.com/roles"];
    if (Array.isArray(rawRoles)) {
      return rawRoles;
    }
    return payload.role ? [payload.role] : [];
  }

  private readEmail(
    profile: Record<string, unknown>,
    payload: KindeTokenPayload,
  ) {
    const candidates = [profile.email, payload.email, profile.preferred_email];
    const email = candidates.find(
      (value): value is string =>
        typeof value === "string" && value.includes("@"),
    );
    return email ?? null;
  }

  private readName(
    profile: Record<string, unknown>,
    payload: KindeTokenPayload,
  ) {
    const fromParts = [
      profile.given_name ?? payload.given_name,
      profile.family_name ?? payload.family_name,
    ]
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      )
      .join(" ");

    if (fromParts) {
      return fromParts;
    }

    const fullName = profile.name ?? payload.name;
    return typeof fullName === "string" && fullName.length > 0
      ? fullName
      : null;
  }

  private readLanguage(
    profile: Record<string, unknown>,
    payload: KindeTokenPayload,
  ) {
    const locale = profile.locale ?? payload.locale ?? profile.preferred_locale;
    if (typeof locale === "string" && locale.length > 0) {
      return locale.slice(0, 10);
    }
    return "en";
  }

  private toUserRole(roles: unknown[]): UserRole {
    const keys = roles.flatMap((role) => {
      if (typeof role === "string") {
        return [role.toLowerCase()];
      }
      if (role && typeof role === "object") {
        const value = role as { key?: string; name?: string };
        return [value.key, value.name]
          .filter((part): part is string => typeof part === "string")
          .map((part) => part.toLowerCase());
      }
      return [];
    });

    return keys.some((key) => key.includes("admin")) ? "admin" : "sales_rep";
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    );
  }

  private async resolveUserWorkspace(input: {
    workspaceId?: string | null;
    name: string;
    email: string;
    defaultLanguage: string;
  }) {
    const existing = await this.findUserWorkspace(
      input.workspaceId,
      input.name,
      input.email,
    );
    if (existing) {
      this.logger.log(`workspace exist ${existing.id}`);
      return {
        id: existing.id,
        message: "workspace exist",
      };
    }

    const database = getDatabase();

    try {
      const [created] = await database
        .insert(workspaces)
        .values({
          name: input.name,
          defaultLanguage: input.defaultLanguage,
        })
        .returning({ id: workspaces.id });

      if (!created?.id) {
        throw new InternalServerErrorException(
          "workspace not created — Workspace insert returned no id",
        );
      }

      this.logger.log(`workspace created ${created.id}`);
      return {
        id: created.id,
        message: "workspace created",
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `workspace not created — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findUserWorkspace(
    workspaceId: string | null | undefined,
    name: string,
    email: string,
  ) {
    const database = getDatabase();

    if (workspaceId) {
      const [byId] = await database
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (byId) {
        return byId;
      }
    }

    const names = [...new Set([name, email].filter(Boolean))];
    if (names.length === 0) {
      return null;
    }

    const [byName] = await database
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(inArray(workspaces.name, names))
      .limit(1);

    return byName ?? null;
  }

}

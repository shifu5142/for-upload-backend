import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import type { Environment } from "../config/environment";
import { setDatabase } from "./database";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly client: Sql | null;
  readonly db: Database | null;

  constructor(
    @Inject(ConfigService)
    configService: ConfigService<Environment, true>,
  ) {
    const databaseUrl = configService.get("DATABASE_URL", { infer: true });

    if (!databaseUrl) {
      this.client = null;
      this.db = null;
      setDatabase(null);
      return;
    }

    this.client = postgres(databaseUrl, {
      max: 10,
      prepare: false,
      ssl: "require",
    });
    this.db = drizzle(this.client, { schema });
    setDatabase(this.db);
  }

  async onApplicationShutdown(): Promise<void> {
    setDatabase(null);
    await this.client?.end({ timeout: 5 });
  }
}

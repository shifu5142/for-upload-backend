import { ServiceUnavailableException } from "@nestjs/common";
import type { Database } from "./database.service";

let database: Database | null = null;

export function setDatabase(client: Database | null) {
  database = client;
}

export function getDatabase(): Database {
  if (!database) {
    throw new ServiceUnavailableException(
      "Database is not configured — set DATABASE_URL in .env and restart the server",
    );
  }

  return database;
}

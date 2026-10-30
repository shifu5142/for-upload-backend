import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { getDatabase } from "../db/database";
import { healthLogs } from "../db/health-logs";
import type {
  DatabaseHealthResponseDto,
  HealthResponseDto,
} from "./health-response.dto";

@Injectable()
export class HealthService {
  getHealth(): HealthResponseDto {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  async recordDatabaseHealth(): Promise<DatabaseHealthResponseDto> {
    const database = getDatabase();

    try {
      const [log] = await database
        .insert(healthLogs)
        .values({ endpoint: "/api/v1/health/database", status: "ok" })
        .returning({
          id: healthLogs.id,
          status: healthLogs.status,
          timestamp: healthLogs.createdAt,
        });

      if (!log) {
        throw new Error("Database insert returned no row");
      }

      return {
        id: log.id,
        status: log.status,
        timestamp: log.timestamp.toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException("Database is unavailable", {
        cause: error,
      });
    }
  }
}

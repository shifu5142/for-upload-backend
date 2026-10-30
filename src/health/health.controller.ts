import { Controller, Get, Inject, Post } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HealthService } from "./health.service";
import {
  DatabaseHealthResponseDto,
  HealthResponseDto,
} from "./health-response.dto";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Check API availability" })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }

  @Post("database")
  @ApiOperation({ summary: "Write a health log to the database" })
  @ApiCreatedResponse({ type: DatabaseHealthResponseDto })
  @ApiServiceUnavailableResponse({
    description: "Database is not configured or unavailable",
  })
  recordDatabaseHealth(): Promise<DatabaseHealthResponseDto> {
    return this.healthService.recordDatabaseHealth();
  }
}

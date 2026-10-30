import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./db/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { PromptsDataModule } from "./prompts-data/prompts-data.module";
import { AuthModule } from "./auth/auth.module";
import { CategoryModule } from "./category/category.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { SupabaseModule } from "./supabase/supabse.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    PromptsDataModule,
    AuthModule,
    CategoryModule,
    SupabaseModule,
    AttachmentsModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}

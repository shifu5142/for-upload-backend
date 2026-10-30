import { Module } from "@nestjs/common";
import { PromptsDataController } from "./prompts-data.controller";
import { PromptsDataService } from "./prompts-data.service";

@Module({
  controllers: [PromptsDataController],
  providers: [PromptsDataService],
})
export class PromptsDataModule {}

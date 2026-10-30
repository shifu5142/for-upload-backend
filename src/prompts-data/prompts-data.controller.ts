import { Body, Controller, Post } from "@nestjs/common";
import { CategoryPublishDto, GetPromptsDto } from "./dto/get-prompts.dto";
import { PromptsDataService } from "./prompts-data.service";

@Controller("prompts-data")
export class PromptsDataController {
  constructor(private readonly promptsDataService: PromptsDataService) {}

  @Post("get-prompts")
  async getPrompt(@Body() body: GetPromptsDto) {
    const prompt = await this.promptsDataService.getPrompt(
      body.categoryId,
      body.subcategoryId,
      body.itemId,
    );
    return { data: prompt };
  }

  @Post("category-publish")
  async categoryPublish(@Body() body: CategoryPublishDto) {
    const category = await this.promptsDataService.categoryPublish(body);
    return {
      data: category,
    };
  }
}

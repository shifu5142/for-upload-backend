import { Test, TestingModule } from "@nestjs/testing";
import { PromptsDataController } from "./prompts-data.controller";

describe("PromptsDataController", () => {
  let controller: PromptsDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptsDataController],
    }).compile();

    controller = module.get<PromptsDataController>(PromptsDataController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

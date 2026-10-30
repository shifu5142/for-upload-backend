import { Test, TestingModule } from "@nestjs/testing";
import { PromptsDataService } from "./prompts-data.service";

describe("PromptsDataService", () => {
  let service: PromptsDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptsDataService],
    }).compile();

    service = module.get<PromptsDataService>(PromptsDataService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

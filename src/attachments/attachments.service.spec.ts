import { Test, TestingModule } from "@nestjs/testing";
import { SupabaseService } from "../supabase/supabase.service";
import { AttachmentsService } from "./attachments.service";

describe("AttachmentsService", () => {
  let service: AttachmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: SupabaseService, useValue: { getClient: jest.fn() } },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

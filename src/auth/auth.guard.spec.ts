import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  it("should be defined", () => {
    const configService = {
      get: () => "https://example.kinde.com",
    } as unknown as ConfigService;

    expect(new AuthGuard(configService)).toBeDefined();
  });
});

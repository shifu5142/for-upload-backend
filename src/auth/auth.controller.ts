import { Controller, Get, Post, Req, UseGuards, Headers } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get("token-data")
  @UseGuards(AuthGuard)
  getMe(@Req() req: any) {
    return {
      user: req.user.role,
    };
  }
  @Post("sync-kinde-user")
  async syncKindeUser(@Headers("authorization") authorization?: string) {
    return this.authService.syncKindeUser(authorization);
  }
}

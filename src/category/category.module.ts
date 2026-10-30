import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

@Module({
  imports: [AuthModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}

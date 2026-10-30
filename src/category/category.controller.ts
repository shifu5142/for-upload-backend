import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import { DeleteSubCategoryDto } from "./dto/delete-subcategory.dto";
import { UpdateSubCategoryDto } from "./dto/updateSubCategory.dto";
import { ToggleCategoryDto } from "./dto/togglecategory.dto";
import { CreateSubCategoryDto } from "./dto/CreateSubCategory.dto";
import { ToggleSubCategoryDto } from "./dto/toggleSubCategory.dto";
import { ReorderSubcategoriesDto } from "./dto/reorder-subcategories.dto";
@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get("all")
  async getAllCategories(@Headers("authorization") authorization: string) {
    return this.categoryService.getAllCategories(authorization);
  }

  @Delete("subcategoriesdelete")
  async deleteSubCategory(@Body() body: DeleteSubCategoryDto) {
    return this.categoryService.deleteSubCategory(
      body.categoryId,
      body.subcategoryId,
    );
  }

  @Delete(":id")
  async deleteCategory(@Param("id") id: string) {
    await this.categoryService.deleteCategory(id);

    return {
      message: "Category deleted successfully",
    };
  }
  @Post("updatesubcategory")
  async updateSubCategory(
    @Headers("authorization") authorization: string,
    @Body() body: UpdateSubCategoryDto,
  ) {
    return this.categoryService.updateSubCategory(authorization, body);
  }
  @Post("toggle-active")
  async toggleActive(
    @Headers("authorization") authorization: string,
    @Body() body: ToggleCategoryDto,
  ) {
    return this.categoryService.toggleActive(authorization, body);
  }
  @Post("create-subcategory")
  async createSubCategory(
    @Headers("authorization") authorization: string,
    @Body() body: CreateSubCategoryDto,
  ) {
    return this.categoryService.createSubCategory(authorization, body);
  }
  @Post("toggle-subcategory")
  async toggleActiveSubcategory(
    @Headers("authorization") authorization: string,
    @Body() body: ToggleSubCategoryDto,
  ) {
    return this.categoryService.toggleActiveSubcategory(authorization, body);
  }
  @Post("reorder-subcategories")
  async reorderSubcategories(
    @Headers("authorization") authorization: string,
    @Body() body: ReorderSubcategoriesDto,
  ) {
    return this.categoryService.reorderSubcategories(authorization, {
      order: body.order,
      category: body.category,
    });
  }
}

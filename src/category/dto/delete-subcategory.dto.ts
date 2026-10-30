import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeleteSubCategoryDto {
  @ApiProperty({ example: "messageTypes" })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: "course_information" })
  @IsString()
  @IsNotEmpty()
  subcategoryId!: string;
}

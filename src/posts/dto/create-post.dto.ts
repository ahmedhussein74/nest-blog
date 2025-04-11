import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsMongoId()
  postId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

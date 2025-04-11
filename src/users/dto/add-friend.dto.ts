import { IsNotEmpty, IsMongoId } from 'class-validator';

export class AddFriendDto {
  @IsNotEmpty()
  @IsMongoId()
  friendId: string;
}

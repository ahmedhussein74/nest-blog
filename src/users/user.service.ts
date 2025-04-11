import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddFriendDto } from './dto/add-friend.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async addFriend(
    userId: string,
    addFriendDto: AddFriendDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const friend = await this.userModel.findById(addFriendDto.friendId).exec();
    if (!friend) {
      throw new NotFoundException('Friend not found');
    }

    // Check if friend is already added
    if (user.friends.includes(friend._id)) {
      throw new ConflictException('Friend already added');
    }

    user.friends.push(friend._id);
    await user.save();

    return this.userModel
      .findById(userId)
      .populate('friends', '-password -friends')
      .select('-password')
      .exec();
  }

  async removeFriend(userId: string, friendId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Filter out the friend
    user.friends = user.friends.filter(
      (friend) => friend.toString() !== friendId,
    );

    await user.save();

    return this.userModel
      .findById(userId)
      .populate('friends', '-password -friends')
      .select('-password')
      .exec();
  }

  async createPasswordReset(
    email: string,
  ): Promise<{ token: string; user: UserDocument }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save to user
    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    return { token: resetToken, user };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userModel
      .findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      })
      .exec();

    if (!user) {
      throw new NotFoundException('Invalid or expired token');
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }

  async findOrCreateGoogleUser(profile: any): Promise<UserDocument> {
    let user = await this.userModel.findOne({ googleId: profile.id }).exec();

    if (!user) {
      // Check if user exists with the same email
      user = await this.userModel
        .findOne({ email: profile.emails[0].value })
        .exec();

      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        await user.save();
      } else {
        // Create new user
        user = new this.userModel({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          // Generate a random password for Google users
          password: crypto.randomBytes(16).toString('hex'),
        });
        await user.save();
      }
    }

    return user;
  }
}

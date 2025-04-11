import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UserRole } from '../users/user.schema';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(
    createPostDto: CreatePostDto,
    userId: string,
  ): Promise<PostDocument> {
    const newPost = new this.postModel({
      ...createPostDto,
      user: userId,
    });
    return newPost.save();
  }

  async findAll(): Promise<PostDocument[]> {
    return this.postModel
      .find()
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findById(id)
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
    userRole: string,
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is the owner of the post or an admin
    if (post.user.toString() !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot update this post');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(id, updatePostDto, { new: true })
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .exec();

    return updatedPost;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const post = await this.postModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is the owner of the post or an admin
    if (post.user.toString() !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot delete this post');
    }

    await this.postModel.deleteOne({ _id: id }).exec();
  }

  async likePost(id: string): Promise<PostDocument> {
    const post = await this.postModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    post.likes += 1;
    return post.save();
  }

  async findByUser(userId: string): Promise<PostDocument[]> {
    return this.postModel
      .find({ user: userId })
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .sort({ createdAt: -1 })
      .exec();
  }
}

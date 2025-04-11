import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UserRole } from '../users/user.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<CommentDocument> {
    const newComment = new this.commentModel({
      user: userId,
      post: createCommentDto.postId,
      content: createCommentDto.content,
      images: createCommentDto.images || [],
    });
    return newComment.save();
  }

  async findAll(): Promise<CommentDocument[]> {
    return this.commentModel
      .find()
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .populate('post')
      .exec();
  }

  async findOne(id: string): Promise<CommentDocument> {
    const comment = await this.commentModel
      .findById(id)
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .populate('post')
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    userRole: string,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(id).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the owner of the comment or an admin
    if (comment.user.toString() !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot update this comment');
    }

    const updatedComment = await this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .populate('post')
      .exec();

    return updatedComment;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const comment = await this.commentModel.findById(id).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the owner of the comment or an admin
    if (comment.user.toString() !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    await this.commentModel.deleteOne({ _id: id }).exec();
  }

  async findByPost(postId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ post: postId })
      .populate(
        'user',
        '-password -friends -resetPasswordToken -resetPasswordExpires',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ user: userId })
      .populate('post')
      .sort({ createdAt: -1 })
      .exec();
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private transporter;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: configService.get<string>('email.service'),
      auth: {
        user: configService.get<string>('email.user'),
        pass: configService.get<string>('email.password'),
      },
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (user && (await user.comparePassword(password))) {
        const { password, ...result } = user.toObject();
        return result;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { token, user } = await this.usersService.createPasswordReset(
      forgotPasswordDto.email,
    );

    const resetUrl = `${this.configService.get<string>('frontend.url')}/reset-password/${token}`;

    await this.transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `
        <p>You requested a password reset</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password</p>
        <p>If you didn't request this, please ignore this email</p>
      `,
    });

    return { message: 'Password reset email sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    await this.usersService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );

    return { message: 'Password reset successful' };
  }

  async validateGoogleUser(profile: any) {
    const user = await this.usersService.findOrCreateGoogleUser(profile);
    return user;
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new UnauthorizedException('No user from Google');
    }

    const payload = {
      email: req.user.email,
      sub: req.user._id,
      role: req.user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
      },
    };
  }
}

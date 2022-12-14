import { EmailService } from '../shared/services';
import { Nullable } from '../shared/types';
import { ResponseUserDto } from '../users/dto';
import { userMapper } from '../users/user.mapper';
import { UserRepository } from '../users/user.repository';
import { LoginDto, RegisterDto, ResponseTokenDto } from './dto';
import { TokenService } from './token.service';

class AuthService extends TokenService {
  private readonly userRepository: UserRepository;
  private readonly emailService: EmailService;

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
  }

  async register(userData: RegisterDto): Promise<Nullable<ResponseUserDto>> {
    const { email, username } = userData;

    const existingEmail = await this.userRepository.findOne({ email });

    if (Boolean(existingEmail) === true) {
      return null;
    }

    const existingUsername = await this.userRepository.findOne({ username });

    if (Boolean(existingUsername) === true) {
      return null;
    }

    await this.userRepository.create({ ...userData });

    const user = await this.userRepository.findOne({ email });

    return userMapper(user);
  }

  async loginWithEmailAndPassword(userData: LoginDto): Promise<Nullable<ResponseTokenDto>> {
    const user = await this.userRepository.validate(userData);

    if (Boolean(user) === false) {
      return null;
    }

    const token = await this.findTokenByUserId(user?._id);

    if (Boolean(token) === true) {
      await token?.remove();
    }

    const { accessToken, refreshToken } = await this.generateAndSaveAuthTokens(user?._id as string);

    return { accessToken, refreshToken };
  }

  async forgotPassword(userEmail: string): Promise<Nullable<string>> {
    const user = await this.userRepository.findOne({ email: userEmail });

    if (Boolean(user) === false) {
      return null;
    }

    const linkToResetPassword = await this.generateLinkToResetPassword(user?._id);

    this.emailService.send(
      user?.email as string,
      'Reset password',
      ` <p>Hi ${user?.username},</p>
        <P>this email is to reset your password. If you don't request this change ignore this message.</p>
        <p>Click the link below to reset your password</p>
        <a href="${linkToResetPassword}}">Reset Password</a>
      `
    );

    return linkToResetPassword;
  }

  async resetPassword(userId: string, token: string, password: string): Promise<boolean> {
    await this.validateEmailToken(token);

    const user = await this.userRepository.resetPassword(userId, password);

    return Boolean(user);
  }
}

export { AuthService };

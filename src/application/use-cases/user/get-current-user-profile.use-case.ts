import {
  GetCurrentUserProfileUseCasePort,
  GetCurrentUserProfileCommand,
  GetCurrentUserProfileView,
} from "@/application/ports/driving/get-current-user-profile.use-case.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { User } from "@/domain/entities/user.entity";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { UserMapper } from "@/application/mappers/user.mapper";

export class GetCurrentUserProfileUseCase implements GetCurrentUserProfileUseCasePort {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute({ userId }: GetCurrentUserProfileCommand): Promise<GetCurrentUserProfileView> {
    const startTime = Date.now();

    this.logGetUserStarted(userId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException();

    this.logSuccessfulGetUser(user, startTime);

    return UserMapper.toProfileView(user);
  }

  private logGetUserStarted(userId: string): void {
    this.logger.debug({
      context: "GetCurrentUserProfileUseCase",
      event: "USER_PROFILE_FETCH_STARTED",
      message: `Fetching profile for user started`,
      data: { userId },
    });
  }

  private logSuccessfulGetUser(user: User, startTime: number): void {
    this.logger.info({
      context: "GetCurrentUserProfileUseCase",
      event: "USER_PROFILE_FETCH_SUCCESSFUL",
      message: `User profile fetched successfully`,
      userId: user.getId(),
      durationMs: Date.now() - startTime,
      data: {
        role: user.getRole(),
      },
    });
  }
}

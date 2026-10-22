import { UserProfileView } from "@/application/types/user.type";

export interface GetCurrentUserProfileCommand {
  userId: string;
}

export type GetCurrentUserProfileView = UserProfileView;

export interface GetCurrentUserProfileUseCasePort {
  execute(command: GetCurrentUserProfileCommand): Promise<GetCurrentUserProfileView>;
}

import { UserRoleType } from "@/domain/types/user.type";

export interface UserProfileView {
  id: string;
  name: string;
  address: string | null;
  email: string;
  role: UserRoleType;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

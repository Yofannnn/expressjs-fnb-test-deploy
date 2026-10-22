import { User } from "@/domain/entities/user.entity";
import { UserProfileView } from "../types/user.type";

export class UserMapper {
  static toProfileView(user: User): UserProfileView {
    return {
      id: user.getId(),
      name: user.getName(),
      address: user.getAddress(),
      email: user.getEmail(),
      role: user.getRole(),
      emailVerifiedAt: user.getEmailVerifiedAt(),
      createdAt: user.getCreatedAt(),
    };
  }
}

import { UserRoleType } from "@/domain/types/user.type";
import { UploadFilePayload } from "../driven/object-storage.port";

export interface CreateProductCategoryPayload {
  name: string;
  description?: string;
  image?: UploadFilePayload;
}

export interface CreateProductCategoryCommand {
  userId: string;
  userRole: UserRoleType;
  payload: CreateProductCategoryPayload;
}

export interface CreateProductCategoryUseCasePort {
  execute(command: CreateProductCategoryCommand): Promise<{ id: string }>;
}

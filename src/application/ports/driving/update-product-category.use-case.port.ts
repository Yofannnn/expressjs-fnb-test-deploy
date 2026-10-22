import { ProductCategoryStatus } from "@/domain/types/product-category.type";
import { UserRoleType } from "@/domain/types/user.type";
import { UploadFilePayload } from "../driven/object-storage.port";

export interface UpdateProductCategoryPayload {
  id: string;
  name?: string;
  description?: string;
  image?: UploadFilePayload;
  status?: ProductCategoryStatus;
}

export interface UpdateProductCategoryCommand {
  userId: string;
  userRole: UserRoleType;
  payload: UpdateProductCategoryPayload;
}

export interface UpdateProductCategoryUseCasePort {
  execute(command: UpdateProductCategoryCommand): Promise<{ id: string }>;
}

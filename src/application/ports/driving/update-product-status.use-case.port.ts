import { ProductStatus } from "@/domain/types/product.type";
import { UserRoleType } from "@/domain/types/user.type";

export interface UpdateProductStatusPayload {
  id: string;
  setStatus: ProductStatus;
}

export interface UpdateProductStatusCommand {
  userId: string;
  userRole: UserRoleType;
  payload: UpdateProductStatusPayload;
}

export interface UpdateProductStatusUseCasePort {
  execute(command: UpdateProductStatusCommand): Promise<{ id: string }>;
}

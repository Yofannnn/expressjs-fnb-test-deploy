import { ProductType } from "@/domain/types/product.type";
import { UserRoleType } from "@/domain/types/user.type";

export interface UpdateProductPayload {
  id: string;
  categoryId?: string;
  name?: string;
  price?: number;
  description?: string;
  type?: ProductType;
  ingredients?: string;
  preparationTimeInMinutes?: number;
}

export interface UpdateProductCommand {
  userId: string;
  userRole: UserRoleType;
  payload: UpdateProductPayload;
}

export interface UpdateProductUseCasePort {
  execute(command: UpdateProductCommand): Promise<{ id: string }>;
}

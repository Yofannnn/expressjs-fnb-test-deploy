import { ProductStatus, ProductType } from "@/domain/types/product.type";
import { UserRoleType } from "@/domain/types/user.type";
import { UploadFilePayload } from "../driven/object-storage.port";

export interface CreateProductPayload {
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  stockQuantity?: number;
  type: ProductType;
  status?: ProductStatus;
  ingredients?: string;
  preparationTimeInMinutes?: number;
  images: UploadFilePayload[];
}

export interface CreateProductCommand {
  userId: string;
  userRole: UserRoleType;
  payload: CreateProductPayload;
}

export interface CreateProductUseCasePort {
  execute(command: CreateProductCommand): Promise<{ id: string }>;
}

import { UserRoleType } from "@/domain/types/user.type";

export interface UpdateProductStockPayload {
  id: string;
  restock?: number;
  deductStock?: number;
  setStock?: number;
}

export interface UpdateProductStockCommand {
  userId: string;
  userRole: UserRoleType;
  payload: UpdateProductStockPayload;
}

export interface UpdateProductStockUseCasePort {
  execute({ userId, userRole, payload }: UpdateProductStockCommand): Promise<{ id: string }>;
}

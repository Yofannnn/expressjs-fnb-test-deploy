import { UserRoleType } from "@/domain/types/user.type";

export interface ReorderProductCategoriesPayload {
  id: string;
  sortOrder: number;
}

export interface ReorderProductCategoriesCommand {
  userId: string;
  userRole: UserRoleType;
  payload: ReorderProductCategoriesPayload[];
}

export interface ReorderProductCategoriesUseCasePort {
  execute(command: ReorderProductCategoriesCommand): Promise<void>;
}

import { UserRoleType } from "@/domain/types/user.type";
import { UploadFilePayload } from "../driven/object-storage.port";

export enum UpdateProductImageAction {
  ADD = "ADD",
  REMOVE = "REMOVE",
  REPLACE = "REPLACE",
  REORDER = "REORDER",
}

export type UpdateProductImagePayload =
  | {
      id: string;
      action: UpdateProductImageAction.ADD;
      imageFile: UploadFilePayload;
    }
  | {
      id: string;
      action: UpdateProductImageAction.REMOVE;
      imageUrl: string;
    }
  | {
      id: string;
      action: UpdateProductImageAction.REPLACE;
      oldImageUrl: string;
      imageFile: UploadFilePayload;
    }
  | {
      id: string;
      action: UpdateProductImageAction.REORDER;
      reorderedUrls: string[];
    };

export interface UpdateProductImageCommand {
  userId: string;
  userRole: UserRoleType;
  payload: UpdateProductImagePayload;
}

export interface UpdateProductImageUseCasePort {
  execute(command: UpdateProductImageCommand): Promise<{ id: string }>;
}

import { TransactionContext } from "@/infrastructure/database/database.type";
import { Prisma } from "../../../prisma/generated";

export class PrismaTransactionContext implements TransactionContext {
  constructor(
    public readonly prismaTransaction: Prisma.TransactionClient,
    public readonly id: string = crypto.randomUUID(),
    public readonly timestamp: Date = new Date(),
  ) {}
}

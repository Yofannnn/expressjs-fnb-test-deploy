export interface TransactionContext {
  readonly id: string;
  readonly timestamp: Date;
}

export interface Transactional<T> {
  withTransaction(tx: TransactionContext): T;
}

export interface DatabaseClient {
  executeInTransaction<T>(operation: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

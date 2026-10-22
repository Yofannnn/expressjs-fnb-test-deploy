import {
  BrowseOrdersUseCasePort,
  BrowseOrdersCommand,
  BrowseOrdersQueryCommand,
  BrowseOrdersResult,
} from "@/application/ports/driving/browse-orders.use-case.port";
import { OrderMapper } from "@/application/mappers/order.mapper";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { OrderRepositoryPort } from "@/application/ports/driven/order.repository.port";
import { UserRoleType } from "@/domain/types/user.type";

export class BrowseOrdersUseCase implements BrowseOrdersUseCasePort {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: BrowseOrdersCommand): Promise<BrowseOrdersResult> {
    const startTime = Date.now();

    this.logBrowseOrdersStart(command.query);

    const memberId = command.role === UserRoleType.MEMBER ? command.userId : undefined;
    const orders = await this.orderRepository.browse({ ...command.query, memberId });

    this.logSuccessfulBrowseOrders(startTime, command.query);

    return orders.map((order) => OrderMapper.toSummaryView(order));
  }

  private logBrowseOrdersStart(query: BrowseOrdersQueryCommand): void {
    this.logger.debug({
      context: "BrowseOrdersUseCase",
      event: "BROWSE_ORDERS_STARTED",
      message: "Orders is being retrieved",
      data: { query },
    });
  }

  private logSuccessfulBrowseOrders(startTime: number, query: BrowseOrdersQueryCommand): void {
    this.logger.info({
      context: "BrowseOrdersUseCase",
      event: "BROWSE_ORDERS_SUCCESSFUL",
      message: "Orders retrieved successfully",
      durationMs: Date.now() - startTime,
      data: { query },
    });
  }
}

import { Product } from "../entities/product.entity";
import { OrderContainsUnknownProductsException } from "../exceptions/order.exceptions";
import { OrderItemCreationData } from "../types/order.type";

interface OrderedItem {
  productId: string;
  quantity: number;
  note?: string;
}

export class OrderItemResolverService {
  static resolve(orderedItems: OrderedItem[], products: Product[]): OrderItemCreationData[] {
    const productsById = new Map(products.map((p) => [p.getId(), p]));

    return orderedItems.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new OrderContainsUnknownProductsException();

      product.assertCanOrder(item.quantity);

      return {
        productId: product.getId(),
        productName: product.getName(),
        priceSnapshot: product.getPrice().getAmount(),
        quantity: item.quantity,
        note: item.note,
      };
    });
  }
}

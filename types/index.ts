export type Product = {
  id: string; name: string; slug: string; description: string; category: 'acc'|'file'|'service'|'software'|'other';
  price: number; originalPrice: number; discount: number; thumbnail: string; images: string[]; inventoryCount: number;
  soldCount: number; viewCount: number; downloadCount?: number; status: 'active'|'inactive'; featured: boolean; fileStoragePath?: string;
  createdAt: string; updatedAt: string;
};
export type CartItem = { productId: string; quantity: number };
export type OrderItem = { productId: string; name: string; category: string; unitPrice: number; quantity: number; discount: number };
export type Order = { id: string; userId: string; items: OrderItem[]; subtotal: number; discount: number; total: number; paymentMethod:'wallet'; status:string; deliveryStatus:string; createdAt:string; completedAt?:string };

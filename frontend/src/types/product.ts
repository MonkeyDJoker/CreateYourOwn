export interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  subCategory?: string;
  imageUrl?: string;
  createdAt: number;
}
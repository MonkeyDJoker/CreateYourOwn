import axios from 'axios';
import type { ProductItem } from '../types/product';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
});

export async function getProducts(): Promise<ProductItem[]> {
  const res = await api.get<ProductItem[]>('/products', {
    params: { _sort: 'createdAt', _order: 'desc' },
  });
  return res.data;
}
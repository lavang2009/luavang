'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';
type State={items:CartItem[];add:(item:CartItem)=>void;remove:(productId:string)=>void;setQty:(productId:string,quantity:number)=>void;clear:()=>void};
export const useCartStore=create<State>()(persist((set)=>({items:[],add:(item)=>set(s=>{const found=s.items.find(i=>i.productId===item.productId);return {items:found?s.items.map(i=>i.productId===item.productId?{...i,quantity:i.quantity+item.quantity}:i):[...s.items,item]}}),remove:(productId)=>set(s=>({items:s.items.filter(i=>i.productId!==productId)})),setQty:(productId,quantity)=>set(s=>({items:s.items.map(i=>i.productId===productId?{...i,quantity:Math.min(20,Math.max(1,Math.trunc(quantity)))}:i)})),clear:()=>set({items:[]})}),{name:'lua-vang-cart'}));

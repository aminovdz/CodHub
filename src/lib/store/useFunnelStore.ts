import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  isUpsell: boolean;
  isBump?: boolean;
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
}

interface FunnelState {
  // Step 1: Lead Capture
  customerName: string;
  phone: string;
  draftOrderId: string | null;
  
  // Step 2: The Maximizer (Cart Array)
  cart: CartItem[];
  
  // Step 3: Address & Comment
  addressData: any; // Dynamic: {"wilaya", "commune"} or {"full_address"}
  deliveryInstructions: string;
  
  // Final state
  email: string;
  status: 'IDLE' | 'DRAFT_SAVING' | 'CONFIRMING' | 'SUCCESS';
  
  // Getters
  getTotalPrice: () => number;
  
  // Actions
  setLead: (name: string, phone: string) => void;
  setDraftOrderId: (id: string) => void;
  
  // Cart Actions
  addCartItem: (item: CartItem) => void;
  removeCartItem: (id: string) => void;
  buyNow: (item: CartItem) => void; // Clears cart, adds single item, sets up for checkout
  
  setAddressData: (data: any) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setEmail: (email: string) => void;
  setStatus: (status: FunnelState['status']) => void;
  resetFunnel: () => void;
}

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      customerName: '',
      phone: '',
      draftOrderId: null,
      cart: [],
      addressData: {},
      deliveryInstructions: '',
      email: '',
      status: 'IDLE',

      getTotalPrice: () => get().cart.reduce((sum, item) => sum + item.price, 0),

      setLead: (name, phone) => set({ customerName: name, phone }),
      setDraftOrderId: (id) => set({ draftOrderId: id }),
      
      addCartItem: (item) => set((state) => ({ 
        cart: [...state.cart.filter(i => i.id !== item.id), item] // Prevent duplicates
      })),
      
      removeCartItem: (id) => set((state) => ({
        cart: state.cart.filter(i => i.id !== id)
      })),
      
      // Buy Now: Wipes existing cart, forces only this item, and resets draft state for a fresh order
      buyNow: (item) => set({ cart: [item], draftOrderId: null, status: 'IDLE' }),
      
      setAddressData: (data) => set({ addressData: data }),
      setDeliveryInstructions: (instructions) => set({ deliveryInstructions: instructions }),
      setEmail: (email) => set({ email }),
      setStatus: (status) => set({ status }),
      
      resetFunnel: () => set({
        customerName: '',
        phone: '',
        draftOrderId: null,
        cart: [],
        addressData: {},
        deliveryInstructions: '',
        email: '',
        status: 'IDLE'
      })
    }),
    {
      name: 'cod-funnel-storage',
    }
  )
);

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';

const wrapper = ({ children }: any) => <CartProvider>{children}</CartProvider>;

const product1 = { id: 'p1', name: 'Plan A', price: 30000 };
const product2 = { id: 'p2', name: 'Plan B', price: 50000 };

describe('CartContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
    expect(result.current.cartCount).toBe(0);
  });

  it('addItem adds a product with quantity 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0]).toMatchObject({ id: 'p1', quantity: 1 });
  });

  it('addItem increments quantity for duplicate product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.addItem(product1));

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('addItem caps quantity at 99', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    // Set quantity to 99
    act(() => result.current.updateQuantity('p1', 99));
    // Try adding again
    act(() => result.current.addItem(product1));

    expect(result.current.cartItems[0].quantity).toBe(99);
  });

  it('removeItem removes a product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.addItem(product2));
    act(() => result.current.removeItem('p1'));

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe('p2');
  });

  it('updateQuantity changes quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.updateQuantity('p1', 5));

    expect(result.current.cartItems[0].quantity).toBe(5);
  });

  it('updateQuantity ignores quantity < 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.updateQuantity('p1', 0));

    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('updateQuantity ignores quantity > 99', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.updateQuantity('p1', 100));

    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.addItem(product2));
    act(() => result.current.clearCart());

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
    expect(result.current.cartCount).toBe(0);
  });

  it('calculates cartTotal correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1)); // 30000 * 1
    act(() => result.current.addItem(product2)); // 50000 * 1
    act(() => result.current.updateQuantity('p1', 2)); // 30000 * 2

    expect(result.current.cartTotal).toBe(30000 * 2 + 50000 * 1);
  });

  it('calculates cartCount correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));
    act(() => result.current.addItem(product2));
    act(() => result.current.updateQuantity('p1', 3));

    expect(result.current.cartCount).toBe(3 + 1);
  });

  it('persists to sessionStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(product1));

    const stored = JSON.parse(sessionStorage.getItem('ahp_basic_cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('p1');
  });

  it('useCart throws outside CartProvider', () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within CartProvider');
  });
});

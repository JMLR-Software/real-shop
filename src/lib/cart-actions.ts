type Deps = { api: (productId: string) => Promise<unknown>; setStatus: (s: string) => void };

// PLANTED BUG (phase 1): the tick shows before the server has answered. If the write fails,
// the shopper has seen "Added" and the cart is empty.
export async function addToCart({ api, setStatus }: Deps, productId: string): Promise<void> {
  setStatus("Added");
  try {
    await api(productId);
  } catch (e) {
    setStatus((e as Error).message);
  }
}

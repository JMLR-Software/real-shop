type Deps = { api: (productId: string) => Promise<unknown>; setStatus: (s: string) => void };

/** Says "Added" only after the server said so. A failure shows its message, not a tick. */
export async function addToCart({ api, setStatus }: Deps, productId: string): Promise<void> {
  setStatus("Adding…");
  try {
    await api(productId);
    setStatus("Added");
  } catch (e) {
    setStatus((e as Error).message);
  }
}

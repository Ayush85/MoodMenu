export async function recoverOrders<T extends { id: string }>(
  ids: string[],
  fetchOrder: (id: string) => Promise<Response>,
): Promise<{ orders: T[]; retainedIds: string[]; failed: boolean }> {
  const results = await Promise.all(ids.map(async id => {
    try {
      const response = await fetchOrder(id);
      if (response.status === 404 || response.status === 410) return { id, removed: true };
      if (!response.ok) return { id, failed: true };
      const order = await response.json() as T;
      if (order.id !== id) return { id, failed: true };
      return { id, order };
    } catch { return { id, failed: true }; }
  }));
  return {
    orders: results.flatMap(result => result.order ? [result.order] : []),
    retainedIds: results.filter(result => !result.removed).map(result => result.id),
    failed: results.some(result => result.failed === true),
  };
}

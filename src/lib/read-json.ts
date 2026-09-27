/** A rejected response must never masquerade as an empty or successful result. */
export async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Unable to complete the request. Please try again.");
  if (data === null) throw new Error("The server returned an invalid response. Please try again.");
  return data as T;
}

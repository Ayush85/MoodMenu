const REQUEST_TIMEOUT_MS = 2500;

export async function requestDomainProvisioning(): Promise<boolean> {
  const endpoint = process.env.DOMAIN_PROVISIONER_URL;
  const secret = process.env.DOMAIN_PROVISIONER_SECRET;

  if (!endpoint || !secret) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok;
  } catch (error) {
    console.error("Domain provisioning trigger failed:", error);
    return false;
  }
}

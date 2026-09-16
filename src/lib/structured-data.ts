/** Safely serialize JSON-LD that will be placed inside an inline script tag. */
export function serializeJsonLd(value: unknown): string {
  const serialized = JSON.stringify(value) ?? "null";
  return serialized
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

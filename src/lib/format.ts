export function formatPrice(price: number, currency = "Rs."): string {
  return `${currency} ${price.toLocaleString("en-IN")}`;
}

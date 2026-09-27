export function buildFoodImagePrompt(name: string, description: string | null, interpretedDish: string | null): string {
  const subject = interpretedDish?.trim() || [name, description].filter(Boolean).join(", ");
  return `Create a photorealistic professional menu photograph of the exact dish described below.

Canonical dish description: ${subject}
Menu item name: ${name}${description ? `
Menu description: ${description}` : ""}

The image must depict exactly this dish and its defining ingredients or preparation. Do not substitute it with a generic food photo, a different dish, a similar-looking dish, or a restaurant scene. Do not add ingredients that change the identity of the dish. If the item name is local or unfamiliar, use the canonical dish description as the source of truth.

For food or beverages, show the item freshly prepared and tightly framed on an appropriate plate, bowl, or glass, with natural lighting and realistic textures. For a packaged or retail product, show the actual product or packaging as sold and do not turn it into a plated dish. Use a 45-degree or top-down product-photography angle, minimal background, and no people, hands, text, logos, watermark, illustration, cartoon, CGI, or artificial-looking 3D render.`;
}

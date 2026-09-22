// One adapter for the storefront and server. Original products.json is never rewritten.
export function priceCents(value) {
  if (typeof value !== 'string' || !/^\$\d+(?:\.\d{2})?$/.test(value))
    throw new Error(`Invalid price: ${value}`);
  const [whole, fraction = '00'] = value.slice(1).split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || cents < 1)
    throw new Error('Price must be positive integer cents.');
  return cents;
}
export const slug = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function adaptCatalogue(source, imagePaths) {
  const paths = new Set(imagePaths);
  const catalogue = {};
  for (const [id, raw] of Object.entries(source)) {
    if (!/^[a-z0-9-]+$/i.test(id)) throw new Error(`Invalid product key: ${id}`);
    const colours = raw.colours?.length ? raw.colours : ['Standard'];
    const sizeFromTitle = raw.title.match(/\b(\d+)\s?oz\b/i)?.[0] || '';
    const sizes = raw.sizes?.length ? raw.sizes : [sizeFromTitle];
    const folderImages = imagePaths
      .filter((p) => p.startsWith(`images/${id}/`))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const variants = [];
    for (const colour of colours)
      for (const size of sizes) {
        const mapped = raw.colour_images?.[colour];
        const image = mapped ? (paths.has(mapped) ? mapped : null) : folderImages[0] || null;
        variants.push({
          id: [slug(colour), slug(size)].filter(Boolean).join('-'),
          label: [colour, size].filter(Boolean).join(' · '),
          colour,
          size,
          image,
          available: !!image,
          stock: null,
        });
      }
    if (new Set(variants.map((v) => v.id)).size !== variants.length)
      throw new Error(`Duplicate variants: ${id}`);
    const image = variants.find((v) => v.image)?.image || null;
    const mappedImages = Object.values(raw.colour_images || {}).filter((p) => paths.has(p));
    catalogue[id] = {
      id,
      name: raw.title,
      category: raw.category.toLowerCase(),
      brand: raw.brand,
      sku: raw.sku,
      price: `${raw.price} AUD`,
      priceCents: priceCents(raw.price),
      stripePriceId: raw.stripePriceId,
      description: raw.description || [],
      image,
      gallery: [...new Set([...mappedImages, ...folderImages])],
      variants,
      available: !!image,
      testOnly: id === 'glovestest',
      stock: null,
      sourceUrl: raw.url,
      missingImages: variants.filter((v) => !v.image).map((v) => v.label),
    };
  }
  return catalogue;
}

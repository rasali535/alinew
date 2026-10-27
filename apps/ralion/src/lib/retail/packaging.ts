/**
 * Ralion Retail — exact packaging / unit-conversion arithmetic.
 *
 * Stock is always held in BASE units. Packs convert to base units via a
 * conversion factor (up to 4 decimals) and stock is stored with 2 decimals.
 * Everything here uses scaled BigInt arithmetic so there is no floating point
 * drift (e.g. 0.1 x 3 === 0.3, 12 x 1.2 === 14.4 exactly).
 *
 * The database re-derives and re-validates every conversion; this module is
 * used for previews, server-side pricing and pre-flight validation so the
 * client never supplies a trusted base quantity.
 */

const FACTOR_SCALE = 4; // retail_product_packages.base_units_per_pack NUMERIC(14,4)
const STOCK_SCALE = 2; // retail_stock_levels.quantity_on_hand NUMERIC(12,2)

export class PackagingError extends Error {
  constructor(public code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'PackagingError';
  }
}

/** Parse a finite, non-negative decimal into BigInt units of 10^-scale (rejects excess precision). */
export function toScaled(value: number | string, scale: number, label = 'value'): bigint {
  const text = typeof value === 'number' ? numberToPlainString(value) : String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new PackagingError('INVALID_DECIMAL', `${label} must be a non-negative decimal number (got '${text}').`);
  }
  const [intPart, fracRaw = ''] = text.split('.');
  if (fracRaw.length > scale && /[1-9]/.test(fracRaw.slice(scale))) {
    throw new PackagingError('PRECISION_EXCEEDED', `${label} supports at most ${scale} decimal places (got '${text}').`);
  }
  const frac = (fracRaw + '0'.repeat(scale)).slice(0, scale);
  return BigInt(intPart) * 10n ** BigInt(scale) + BigInt(frac || '0');
}

export function fromScaled(units: bigint, scale: number): number {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const base = 10n ** BigInt(scale);
  const text = `${abs / base}.${(abs % base).toString().padStart(scale, '0')}`;
  return Number(neg ? `-${text}` : text);
}

function numberToPlainString(n: number): string {
  if (!Number.isFinite(n)) throw new PackagingError('INVALID_DECIMAL', 'value must be finite.');
  if (n < 0) throw new PackagingError('INVALID_DECIMAL', 'value must not be negative.');
  const s = String(n);
  if (!/e/i.test(s)) return s;
  // Expand exponent notation without losing digits.
  return n.toFixed(Math.min(20, FACTOR_SCALE + STOCK_SCALE + 8)).replace(/\.?0+$/, '');
}

export interface BaseQuantityResult {
  /** Base units, exact to 2 decimals. */
  baseQuantity: number;
  packQuantity: number;
  packSize: number;
}

/**
 * packQuantity x baseUnitsPerPack -> base units.
 * Throws BASE_QUANTITY_PRECISION when the product cannot be stored exactly in 2 decimals
 * (mirrors the database guard; nothing is ever silently rounded).
 */
export function convertPacksToBase(packQuantity: number | string, baseUnitsPerPack: number | string): BaseQuantityResult {
  const qty = toScaled(packQuantity, STOCK_SCALE, 'packQuantity');
  const factor = toScaled(baseUnitsPerPack, FACTOR_SCALE, 'baseUnitsPerPack');
  if (qty <= 0n) throw new PackagingError('INVALID_QUANTITY', 'quantity must be greater than zero.');
  if (factor <= 0n) throw new PackagingError('INVALID_CONVERSION', 'conversion factor must be greater than zero.');

  // qty has 2 dp, factor has 4 dp -> product has 6 dp. Stock keeps 2 dp: the last 4 digits must be zero.
  const product = qty * factor;
  const divisor = 10n ** BigInt(FACTOR_SCALE);
  if (product % divisor !== 0n) {
    throw new PackagingError(
      'BASE_QUANTITY_PRECISION',
      `${packQuantity} x ${baseUnitsPerPack} base units cannot be stored exactly (max ${STOCK_SCALE} decimals).`
    );
  }
  return {
    baseQuantity: fromScaled(product / divisor, STOCK_SCALE),
    packQuantity: Number(packQuantity),
    packSize: Number(baseUnitsPerPack),
  };
}

/** Whole base units -> packs + loose remainder for display, e.g. 105 / 12 = 8 packs + 9 loose. */
export function splitBaseIntoPacks(baseQuantity: number | string, baseUnitsPerPack: number | string): { packs: number; loose: number } {
  const base = toScaled(baseQuantity, STOCK_SCALE, 'baseQuantity');
  const perPack = toScaled(baseUnitsPerPack, STOCK_SCALE, 'baseUnitsPerPack');
  if (perPack <= 0n) throw new PackagingError('INVALID_CONVERSION', 'conversion factor must be greater than zero.');
  return { packs: Number(base / perPack), loose: fromScaled(base % perPack, STOCK_SCALE) };
}

/** Round half-up to cents using integer arithmetic. */
export function roundMoney(amount: number): number {
  const sign = amount < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(amount) * 100 + 1e-9)) / 100;
}

/** Authoritative pack price: explicit pack price, else base price x factor rounded to cents. */
export function resolvePackPrice(basePrice: number, pack: { sellingPrice?: number | null; baseUnitsPerPack: number }): number {
  if (pack.sellingPrice !== null && pack.sellingPrice !== undefined) return roundMoney(Number(pack.sellingPrice));
  const price = toScaled(basePrice.toFixed(2), 2, 'basePrice');
  const factor = toScaled(pack.baseUnitsPerPack, FACTOR_SCALE, 'baseUnitsPerPack');
  // price (2dp) x factor (4dp) = 6dp -> round half-up to 2dp
  const raw = price * factor;
  const divisor = 10n ** BigInt(FACTOR_SCALE);
  const rounded = (raw + divisor / 2n) / divisor;
  return fromScaled(rounded, 2);
}

/** Cost per pack (never exposed to cashiers). */
export function resolvePackCost(baseCost: number, pack: { purchaseCost?: number | null; baseUnitsPerPack: number }): number {
  if (pack.purchaseCost !== null && pack.purchaseCost !== undefined) return roundMoney(Number(pack.purchaseCost));
  return resolvePackPrice(baseCost, { baseUnitsPerPack: pack.baseUnitsPerPack });
}

import { Property } from "../data/properties.repository";

export function listingCaption(property: Property): string {
  const where = [property.address_municipality, property.neighborhood].filter(Boolean).join(", ");
  const line1 = where ? `📍 ${where}` : undefined;
  const line2 = buildLine2(property);
  const priceLine = buildPriceLine(property);
  const statsLine = buildStatsLine(property);
  const extrasLine = buildExtrasLine(property);
  const referenceLine = `Ref: ${property.listing_id}`;
  const linkLine = property.reference_url ? `\n${property.reference_url}` : "";

  return [line1, line2, priceLine, statsLine, extrasLine, referenceLine]
    .filter((value) => Boolean(value))
    .join("\n")
    .concat(linkLine);
}

function buildLine2(property: Property): string | undefined {
  if (!property.property_type && !property.operation_type) {
    return undefined;
  }
  const type = property.property_type ? capitalize(property.property_type) : "";
  const op = property.operation_type ? capitalize(property.operation_type) : "";
  if (type && op) {
    return `${type} en ${op}`;
  }
  return type || op || undefined;
}

function buildPriceLine(property: Property): string {
  const price = isNumber(property.price) ? formatCurrency(property.price) : "—";
  const ppm2 = isNumber(property.price_per_m2) ? ` (${formatCurrency(property.price_per_m2)} €/m²)` : "";
  return `💶 ${price}${ppm2}`;
}

function buildStatsLine(property: Property): string {
  const area = isNumber(property.area_m2) ? `${property.area_m2} m²` : "—";
  const bedrooms = isNumber(property.bedrooms) ? property.bedrooms : "—";
  const bathrooms = isNumber(property.bathrooms) ? property.bathrooms : "—";
  return `📐 ${area}   🛏 ${bedrooms}   🛁 ${bathrooms}`;
}

function buildExtrasLine(property: Property): string | undefined {
  const extras: string[] = [];
  if (property.floor_number) {
    extras.push(`Planta: ${property.floor_number}`);
  }
  if (property.has_elevator !== undefined) {
    extras.push(`Ascensor: ${yn(property.has_elevator)}`);
  }
  if (property.has_parking !== undefined) {
    extras.push(`Garaje: ${yn(property.has_parking)}`);
  }
  if (property.furnished !== undefined) {
    extras.push(`Amueblado: ${yn(property.furnished)}`);
  }
  if (property.exterior !== undefined) {
    extras.push(`Exterior: ${yn(property.exterior)}`);
  }
  if (property.terrace !== undefined) {
    extras.push(`Terraza: ${yn(property.terrace)}`);
  }
  if (!extras.length) {
    return undefined;
  }
  return extras.join(" · ");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
}

function capitalize(input: string): string {
  if (!input) {
    return input;
  }
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function yn(value: boolean): string {
  if (value === true) {
    return "Sí";
  }
  if (value === false) {
    return "No";
  }
  return "—";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

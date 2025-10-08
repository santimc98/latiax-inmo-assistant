import { Property } from "../data/properties.repository";

export function listingCaption(p: Property): string {
  const firstLine = `🏷️ ${p.title || p.property_type || "Inmueble"} — ${formatLocation(
    p.address_municipality,
    p.neighborhood,
  )}`;
  const secondLine = `💶 ${formatPrice(p.price)} | ${formatArea(p.area_m2)} | ${formatCount(
    p.bedrooms,
  )} hab | ${formatCount(p.bathrooms)} baño`;
  const extras = buildExtras(p);
  const lines = [firstLine, secondLine, extras.length ? extras.join(" · ") : "—"];

  if (p.reference_url) {
    lines.push(`🔗 ${p.reference_url}`);
  }

  return lines.join("\n");
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Consultar";
  }
  const formatter = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "— m²";
  }
  const rounded = Math.round(value * 10) / 10;
  return `${stripTrailingZero(rounded)} m²`;
}

function stripTrailingZero(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatCount(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function buildExtras(p: Property): string[] {
  const extras: string[] = [];
  if (p.has_elevator) extras.push("Ascensor");
  if (p.has_parking) extras.push("Garaje");
  if (p.terrace) extras.push("Terraza");
  if (p.air_conditioning) extras.push("AA");
  if (p.exterior) extras.push("Exterior");
  if (p.furnished) extras.push("Amueblado");
  if (p.storage_room) extras.push("Trastero");
  if (p.pets_allowed) extras.push("Mascotas OK");
  return extras;
}

function formatLocation(municipality: string | null, neighborhood: string | null): string {
  const parts = [municipality ?? ""];
  if (neighborhood) {
    parts.push(neighborhood);
  }
  return parts.filter(Boolean).join(", ") || "Ubicación sin especificar";
}

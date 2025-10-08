import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type Property = {
  listing_id: string;
  title: string | null;
  description: string | null;
  operation_type: string | null;
  property_type: string | null;
  price: number | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address_municipality: string | null;
  neighborhood: string | null;
  has_elevator: boolean | null;
  has_parking: boolean | null;
  furnished: boolean | null;
  exterior: boolean | null;
  terrace: boolean | null;
  storage_room: boolean | null;
  air_conditioning: boolean | null;
  pets_allowed: boolean | null;
  reference_url: string | null;
  primary_image_url: string | null;
  photos: string | null;
  photo_count: number | null;
  price_per_m2: number | null;
  [key: string]: unknown;
};

export class PropertiesRepository {
  private properties: Property[] = [];

  constructor(private readonly csvPath: string) {}

  load(): void {
    const resolvedPath = path.resolve(this.csvPath);
    const content = fs.readFileSync(resolvedPath, "utf8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as Record<string, unknown>[];

    this.properties = records
      .map((record) => toProperty(record))
      .filter((property): property is Property => property !== null);
  }

  all(): Property[] {
    return this.properties;
  }

  getById(id: string): Property | undefined {
    if (!id) {
      return undefined;
    }
    const normalized = String(id).trim();
    if (!normalized) {
      return undefined;
    }
    return this.properties.find((item) => String(item.listing_id).trim() === normalized);
  }
}

function toProperty(record: Record<string, unknown>): Property | null {
  const listingId = getString(record, "listing_id");
  if (!listingId) {
    return null;
  }

  const rawPhotos = record.photos ?? record.photo_urls;
  const { photos, primaryFromPhotos, photoCountFromPhotos } = normalizePhotos(rawPhotos);

  const price = getNumber(record, "price");
  const area = getNumber(record, "area_m2");
  const pricePerM2 = getNumber(record, "price_per_m2") ?? (price && area ? safeDivide(price, area) : null);

  const primaryImage =
    getString(record, "primary_image_url") ?? getString(record, "main_image") ?? primaryFromPhotos;
  const photoCount = getNumber(record, "photo_count") ?? photoCountFromPhotos;

  return {
    ...record,
    listing_id: listingId,
    title: getString(record, "title"),
    description: getString(record, "description"),
    operation_type: getString(record, "operation_type"),
    property_type: getString(record, "property_type"),
    price,
    area_m2: area,
    bedrooms: getNumber(record, "bedrooms"),
    bathrooms: getNumber(record, "bathrooms"),
    address_municipality: getString(record, "address_municipality"),
    neighborhood: getString(record, "neighborhood"),
    has_elevator: getBoolean(record, "has_elevator"),
    has_parking: getBoolean(record, "has_parking"),
    furnished: getBoolean(record, "furnished"),
    exterior: getBoolean(record, "exterior"),
    terrace: getBoolean(record, "terrace"),
    storage_room: getBoolean(record, "storage_room"),
    air_conditioning: getBoolean(record, "air_conditioning"),
    pets_allowed: getBoolean(record, "pets_allowed"),
    reference_url: getString(record, "reference_url"),
    primary_image_url: primaryImage,
    photos,
    photo_count: photoCount,
    price_per_m2: pricePerM2,
  } satisfies Property;
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  return str ? str : null;
}

function getNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "t", "si", "sí", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "f", "no", "n"].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizePhotos(value: unknown): {
  photos: string | null;
  primaryFromPhotos: string | null;
  photoCountFromPhotos: number | null;
} {
  if (value === undefined || value === null) {
    return { photos: null, primaryFromPhotos: null, photoCountFromPhotos: null };
  }

  const asString = String(value).trim();
  if (!asString) {
    return { photos: null, primaryFromPhotos: null, photoCountFromPhotos: null };
  }

  let urls: string[] = [];
  if (asString.startsWith("[")) {
    try {
      const parsed = JSON.parse(asString);
      if (Array.isArray(parsed)) {
        urls = parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // ignore JSON parse errors and fall through to delimiter-based parsing
    }
  }

  if (!urls.length) {
    const delimiter = asString.includes("|") ? "|" : asString.includes(",") ? "," : " ";
    urls = asString
      .split(delimiter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!urls.length) {
    return { photos: null, primaryFromPhotos: null, photoCountFromPhotos: null };
  }

  const uniqueUrls = Array.from(new Set(urls));
  return {
    photos: uniqueUrls.join("|"),
    primaryFromPhotos: uniqueUrls[0] ?? null,
    photoCountFromPhotos: uniqueUrls.length,
  };
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator) {
    return null;
  }
  return Number.isFinite(numerator / denominator) ? numerator / denominator : null;
}

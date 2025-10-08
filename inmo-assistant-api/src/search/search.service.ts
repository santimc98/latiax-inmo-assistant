import { PropertiesRepository, Property } from "../data/properties.repository";
import type { Plan } from "../nlu/nlu.service";

const STRING_FILTERS: Array<keyof Pick<Plan["filters"], "operation_type" | "property_type" | "address_municipality" | "neighborhood">> = [
  "operation_type",
  "property_type",
  "address_municipality",
  "neighborhood",
];

const BOOLEAN_FILTERS: Array<
  keyof Pick<
    Plan["filters"],
    | "has_elevator"
    | "has_parking"
    | "furnished"
    | "exterior"
    | "terrace"
    | "storage_room"
    | "air_conditioning"
    | "pets_allowed"
  >
> = [
  "has_elevator",
  "has_parking",
  "furnished",
  "exterior",
  "terrace",
  "storage_room",
  "air_conditioning",
  "pets_allowed",
];

export class SearchService {
  constructor(private readonly repository: PropertiesRepository) {}

  all(): Property[] {
    return this.repository.all();
  }

  getById(id: string): Property | undefined {
    return this.repository.getById(id);
  }

  search(filters: Plan["filters"], limit: number): Property[] {
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
    const results = this.repository
      .all()
      .filter((property) => matchesFilters(property, filters))
      .sort((a, b) => sortByHeuristics(a, b));

    return results.slice(0, normalizedLimit);
  }
}

function matchesFilters(property: Property, filters: Plan["filters"]): boolean {
  if (!filters) {
    return true;
  }

  for (const key of STRING_FILTERS) {
    const filterValue = filters[key];
    if (filterValue === null || filterValue === undefined) {
      continue;
    }
    if (!stringEquals(property[key as keyof Property], filterValue)) {
      return false;
    }
  }

  if (!rangeMatches(property.price, filters.price_min, filters.price_max)) {
    return false;
  }

  if (!rangeMatches(property.area_m2, filters.area_min, filters.area_max)) {
    return false;
  }

  if (!minMatches(property.bedrooms, filters.bedrooms_min)) {
    return false;
  }

  if (!minMatches(property.bathrooms, filters.bathrooms_min)) {
    return false;
  }

  for (const key of BOOLEAN_FILTERS) {
    const filterValue = filters[key];
    if (filterValue === null || filterValue === undefined) {
      continue;
    }
    const propertyValue = property[key as keyof Property];
    if (propertyValue === null || propertyValue === undefined) {
      return false;
    }
    if (Boolean(propertyValue) !== filterValue) {
      return false;
    }
  }

  return true;
}

function stringEquals(value: unknown, filter: string | number | null): boolean {
  if (filter === null || filter === undefined) {
    return true;
  }
  const normalizedFilter = normalizeText(filter);
  if (!normalizedFilter) {
    return true;
  }
  const normalizedValue = normalizeText(value);
  return normalizedValue === normalizedFilter;
}

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function rangeMatches(value: number | null, min: number | null, max: number | null): boolean {
  if (value === null || value === undefined) {
    if (min !== null && min !== undefined) {
      return false;
    }
    if (max !== null && max !== undefined) {
      return false;
    }
    return true;
  }
  if (min !== null && min !== undefined && value < min) {
    return false;
  }
  if (max !== null && max !== undefined && value > max) {
    return false;
  }
  return true;
}

function minMatches(value: number | null, min: number | null): boolean {
  if (min === null || min === undefined) {
    return true;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return value >= min;
}

function sortByHeuristics(a: Property, b: Property): number {
  const photoCountA = coerceNumber(a.photo_count, 0);
  const photoCountB = coerceNumber(b.photo_count, 0);
  if (photoCountA !== photoCountB) {
    return photoCountB - photoCountA;
  }

  const priceCompare = comparePrice(a, b);
  if (priceCompare !== 0) {
    return priceCompare;
  }

  const areaA = coerceNumber(a.area_m2, 0);
  const areaB = coerceNumber(b.area_m2, 0);
  if (areaA !== areaB) {
    return areaB - areaA;
  }

  return 0;
}

function comparePrice(a: Property, b: Property): number {
  const aRental = normalizeText(a.operation_type) === "alquiler";
  const bRental = normalizeText(b.operation_type) === "alquiler";

  const priceA = coerceNumber(a.price, aRental ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const priceB = coerceNumber(b.price, bRental ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

  if (aRental && bRental) {
    return priceA - priceB;
  }
  if (!aRental && !bRental) {
    return priceB - priceA;
  }

  // Mixed operation types: keep rentals before sales when prices tie, otherwise fall back to ascending.
  if (priceA !== priceB) {
    return priceA - priceB;
  }
  return 0;
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

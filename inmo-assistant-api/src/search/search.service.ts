import { PropertiesRepository, Property } from "../data/properties.repository";
import type { Plan } from "../nlu/nlu.service";

export class SearchService {
  constructor(private readonly repository: PropertiesRepository) {}

  getById(id: string): Property | null {
    return this.repository.byId(id) ?? null;
  }

  search(filters: Plan["filters"], limit = 3): Property[] {
    const items = this.repository.all();
    const normalizedLimit = limit > 0 ? limit : 3;

    return items
      .filter((item) => matchesFilters(item, filters))
      .slice(0, normalizedLimit);
  }
}

function matchesFilters(property: Property, filters: Plan["filters"]): boolean {
  if (!filters) {
    return true;
  }

  if (filters.operation_type && !equalsIgnoreCase(property.operation_type, filters.operation_type)) {
    return false;
  }
  if (filters.property_type && !equalsIgnoreCase(property.property_type, filters.property_type)) {
    return false;
  }
  if (
    filters.address_municipality &&
    !equalsIgnoreCase(property.address_municipality, filters.address_municipality)
  ) {
    return false;
  }
  if (filters.neighborhood && !equalsIgnoreCase(property.neighborhood, filters.neighborhood)) {
    return false;
  }

  if (isNumber(filters.price_min)) {
    if (!isNumber(property.price) || property.price < filters.price_min) {
      return false;
    }
  }
  if (isNumber(filters.price_max)) {
    if (!isNumber(property.price) || property.price > filters.price_max) {
      return false;
    }
  }
  if (isNumber(filters.area_min)) {
    if (!isNumber(property.area_m2) || property.area_m2 < filters.area_min) {
      return false;
    }
  }
  if (isNumber(filters.area_max)) {
    if (!isNumber(property.area_m2) || property.area_m2 > filters.area_max) {
      return false;
    }
  }
  if (isNumber(filters.bedrooms_min)) {
    if (!isNumber(property.bedrooms) || property.bedrooms < filters.bedrooms_min) {
      return false;
    }
  }
  if (isNumber(filters.bathrooms_min)) {
    if (!isNumber(property.bathrooms) || property.bathrooms < filters.bathrooms_min) {
      return false;
    }
  }

  if (isBoolean(filters.has_elevator) && property.has_elevator !== filters.has_elevator) {
    return false;
  }
  if (isBoolean(filters.has_parking) && property.has_parking !== filters.has_parking) {
    return false;
  }
  if (isBoolean(filters.furnished) && property.furnished !== filters.furnished) {
    return false;
  }
  if (isBoolean(filters.exterior) && property.exterior !== filters.exterior) {
    return false;
  }
  if (isBoolean(filters.terrace) && property.terrace !== filters.terrace) {
    return false;
  }
  if (isBoolean(filters.storage_room) && property.storage_room !== filters.storage_room) {
    return false;
  }
  if (isBoolean(filters.air_conditioning) && property.air_conditioning !== filters.air_conditioning) {
    return false;
  }
  if (isBoolean(filters.pets_allowed) && property.pets_allowed !== filters.pets_allowed) {
    return false;
  }

  return true;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function equalsIgnoreCase(a?: string, b?: string | null): boolean {
  if (!a || !b) {
    return false;
  }
  return normalizeToken(a) === normalizeToken(b);
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

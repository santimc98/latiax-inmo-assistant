import { SearchService } from "./search.service";
import { Property, PropertiesRepository } from "../data/properties.repository";
import type { Plan } from "../nlu/nlu.service";

class FakeRepository extends PropertiesRepository {
  constructor(private readonly items: Property[]) {
    super("test.csv");
  }

  override all(): Property[] {
    return this.items;
  }

  override getById(id: string): Property | undefined {
    return this.items.find((item) => item.listing_id === id);
  }
}

const baseFilters: Plan["filters"] = {
  operation_type: null,
  property_type: null,
  address_municipality: null,
  neighborhood: null,
  price_min: null,
  price_max: null,
  bedrooms_min: null,
  bathrooms_min: null,
  area_min: null,
  area_max: null,
  has_elevator: null,
  has_parking: null,
  furnished: null,
  exterior: null,
  terrace: null,
  storage_room: null,
  air_conditioning: null,
  pets_allowed: null,
};

function createFilters(filters: Partial<Plan["filters"]> = {}): Plan["filters"] {
  return { ...baseFilters, ...filters };
}

const properties: Property[] = [
  {
    listing_id: "A-1",
    title: "Piso con terraza",
    description: null,
    operation_type: "alquiler",
    property_type: "piso",
    price: 850,
    area_m2: 70,
    bedrooms: 2,
    bathrooms: 1,
    address_municipality: "Granada",
    neighborhood: "Centro",
    has_elevator: true,
    has_parking: false,
    furnished: true,
    exterior: true,
    terrace: true,
    storage_room: false,
    air_conditioning: true,
    pets_allowed: false,
    reference_url: "https://example.com/a-1",
    primary_image_url: "https://example.com/a-1/cover.jpg",
    photos: "https://example.com/a-1/cover.jpg|https://example.com/a-1/2.jpg",
    photo_count: 2,
    price_per_m2: 12.14,
  },
  {
    listing_id: "B-1",
    title: "Dúplex familiar",
    description: null,
    operation_type: "venta",
    property_type: "duplex",
    price: 280000,
    area_m2: 120,
    bedrooms: 4,
    bathrooms: 3,
    address_municipality: "Málaga",
    neighborhood: "La Trinidad",
    has_elevator: true,
    has_parking: true,
    furnished: false,
    exterior: true,
    terrace: false,
    storage_room: true,
    air_conditioning: true,
    pets_allowed: true,
    reference_url: "https://example.com/b-1",
    primary_image_url: "https://example.com/b-1/cover.jpg",
    photos: "https://example.com/b-1/cover.jpg|https://example.com/b-1/2.jpg|https://example.com/b-1/3.jpg",
    photo_count: 3,
    price_per_m2: 2333.33,
  },
  {
    listing_id: "C-1",
    title: "Estudio céntrico",
    description: null,
    operation_type: "alquiler",
    property_type: "estudio",
    price: 550,
    area_m2: 35,
    bedrooms: 0,
    bathrooms: 1,
    address_municipality: "Málaga",
    neighborhood: "Centro Histórico",
    has_elevator: false,
    has_parking: false,
    furnished: true,
    exterior: false,
    terrace: false,
    storage_room: false,
    air_conditioning: false,
    pets_allowed: true,
    reference_url: "https://example.com/c-1",
    primary_image_url: "https://example.com/c-1/cover.jpg",
    photos: "https://example.com/c-1/cover.jpg",
    photo_count: 1,
    price_per_m2: 15.71,
  },
  {
    listing_id: "D-1",
    title: "Chalet con jardín",
    description: null,
    operation_type: "venta",
    property_type: "chalet",
    price: 450000,
    area_m2: 200,
    bedrooms: 5,
    bathrooms: 4,
    address_municipality: "Sevilla",
    neighborhood: "Los Remedios",
    has_elevator: null,
    has_parking: true,
    furnished: false,
    exterior: true,
    terrace: true,
    storage_room: true,
    air_conditioning: true,
    pets_allowed: false,
    reference_url: "https://example.com/d-1",
    primary_image_url: "https://example.com/d-1/cover.jpg",
    photos: "https://example.com/d-1/cover.jpg|https://example.com/d-1/2.jpg",
    photo_count: 2,
    price_per_m2: 2250,
  },
];

describe("SearchService", () => {
  const repository = new FakeRepository(properties);
  const service = new SearchService(repository);

  it("filters by municipality ignoring accents and price range", () => {
    const results = service.search(
      createFilters({ address_municipality: "malaga", price_max: 600, price_min: 500 }),
      10,
    );
    expect(results).toHaveLength(1);
    expect(results[0].listing_id).toBe("C-1");
  });

  it("filters by boolean flags", () => {
    const results = service.search(createFilters({ has_parking: true, operation_type: "venta" }), 10);
    expect(results.map((item) => item.listing_id)).toEqual(["B-1", "D-1"]);
  });

  it("sorts by photo count and price heuristics", () => {
    const results = service.search(createFilters({ operation_type: "alquiler" }), 5);
    expect(results.map((item) => item.listing_id)).toEqual(["A-1", "C-1"]);
  });
});

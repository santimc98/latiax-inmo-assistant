import { z } from "zod";
import { LLMClient, ChatMsg } from "../llm/llm.client";
import { WHATSAPP_PLANNER_PROMPT } from "./prompts/whatsapp_planner";

type Nullable<T> = T | null;

const FilterSchema = z.object({
  operation_type: stringField(),
  property_type: stringField(),
  address_municipality: stringField(),
  neighborhood: stringField(),
  price_min: numberField(),
  price_max: numberField(),
  bedrooms_min: numberField(),
  bathrooms_min: numberField(),
  area_min: numberField(),
  area_max: numberField(),
  has_elevator: booleanField(),
  has_parking: booleanField(),
  furnished: booleanField(),
  exterior: booleanField(),
  terrace: booleanField(),
  storage_room: booleanField(),
  air_conditioning: booleanField(),
  pets_allowed: booleanField(),
});

export const PlanSchema = z.object({
  intent: z.enum([
    "GET_BY_ID",
    "SEARCH",
    "DETAILS",
    "PHOTOS_MORE",
    "LOCATION",
    "PRICE",
    "AVAILABILITY",
    "CONTACT_AGENT",
    "OTHER",
  ]),
  listing_id: z.union([z.string(), z.number()]).optional().nullable().transform(normalizeListingId),
  filters: FilterSchema.default({}).transform((value) => ({
    operation_type: value.operation_type ?? null,
    property_type: value.property_type ?? null,
    address_municipality: value.address_municipality ?? null,
    neighborhood: value.neighborhood ?? null,
    price_min: value.price_min ?? null,
    price_max: value.price_max ?? null,
    bedrooms_min: value.bedrooms_min ?? null,
    bathrooms_min: value.bathrooms_min ?? null,
    area_min: value.area_min ?? null,
    area_max: value.area_max ?? null,
    has_elevator: value.has_elevator ?? null,
    has_parking: value.has_parking ?? null,
    furnished: value.furnished ?? null,
    exterior: value.exterior ?? null,
    terrace: value.terrace ?? null,
    storage_room: value.storage_room ?? null,
    air_conditioning: value.air_conditioning ?? null,
    pets_allowed: value.pets_allowed ?? null,
  })),
  need_fields: z.array(z.string()).optional().default([]),
  result_count: z.number().int().positive().optional().default(3),
  clarification: z
    .object({
      questions: z.array(z.string()),
    })
    .nullable()
    .optional()
    .default(null),
});

export type Plan = z.infer<typeof PlanSchema>;

export class NLUService {
  private readonly llm: LLMClient;

  constructor(llmClient?: LLMClient) {
    this.llm = llmClient ?? new LLMClient();
  }

  async planFromUserText(text: string): Promise<Plan> {
    if (!text || !text.trim()) {
      throw new Error("Mensaje vacío");
    }

    const messages: ChatMsg[] = [
      { role: "system", content: WHATSAPP_PLANNER_PROMPT },
      { role: "user", content: text },
    ];

    const raw = await this.llm.chat(messages);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(`LLM did not return valid JSON:\n${raw}`);
    }
    return PlanSchema.parse(json);
  }
}

function stringField() {
  return z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform(normalizeStringOrNull);
}

function numberField() {
  return z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform(normalizeNumberOrNull);
}

function booleanField() {
  return z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .nullable()
    .transform(normalizeBooleanOrNull);
}

function normalizeListingId(value: string | number | null | undefined): Nullable<string> {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeStringOrNull(value: string | number | null | undefined): Nullable<string> {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeNumberOrNull(value: number | string | null | undefined): Nullable<number> {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBooleanOrNull(
  value: boolean | string | number | null | undefined,
): Nullable<boolean> {
  if (value === null || value === undefined || value === "") {
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

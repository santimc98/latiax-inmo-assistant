import axios from "axios";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export class LLMClient {
  constructor(
    private baseUrl = process.env.LLM_BASE_URL || "",
    private apiKey = process.env.LLM_API_KEY || "",
    private model = process.env.LLM_MODEL || "gpt-4o-mini",
  ) {}

  async chat(messages: ChatMsg[]): Promise<string> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("LLM not configured: set LLM_BASE_URL and LLM_API_KEY");
    }
    const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const { data } = await axios.post(
      url,
      { model: this.model, messages, temperature: 0 },
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM response missing content");
    }
    return content.trim();
  }
}

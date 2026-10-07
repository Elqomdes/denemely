import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FORMAT_PROFILE_JSON_SCHEMA, type FormatProfile } from "../pdf/profile/schema";
const OPENAI_URL = "https://api.openai.com/v1/responses";
function yerelEnvYukle() {
  if (process.env.OPENAI_API_KEY) return;
  const yol = path.join(process.cwd(), ".env");
  if (!existsSync(yol)) return;
  for (const satir of readFileSync(yol, "utf8").split(/\r?\n/)) {
    const eslesme = satir.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!eslesme || process.env[eslesme[1]]) continue;
    process.env[eslesme[1]] = eslesme[2].replace(/^['"]|['"]$/g, "").trim();
  }
}
yerelEnvYukle();
export function openaiAnahtari(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key && key.startsWith("sk-") ? key : null;
}
export function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
}
export class OpenAIHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIHatasi";
  }
}
export async function yapilandirilmisYanit<T>(girdi: {
  sistem: string;
  kullanici: string;
  semaAdi: string;
  sema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  gecerliMi: (value: unknown) => value is T;
}): Promise<T> {
  const key = openaiAnahtari();
  if (!key) throw new OpenAIHatasi("OPENAI_API_KEY tanımlı değil.");
  const yanit = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      reasoning: { effort: girdi.effort ?? "medium" },
      input: [
        { role: "developer", content: girdi.sistem },
        { role: "user", content: girdi.kullanici },
      ],
      text: {
        format: {
          type: "json_schema",
          name: girdi.semaAdi,
          strict: true,
          schema: girdi.sema,
        },
      },
    }),
  });
  const govde = (await yanit.json()) as Record<string, unknown>;
  if (!yanit.ok) {
    const mesaj =
      typeof govde.error === "object" && govde.error && "message" in govde.error
        ? String((govde.error as { message?: string }).message)
        : `OpenAI ${yanit.status}`;
    throw new OpenAIHatasi(mesaj);
  }
  const parsed = ciktiyiCoz(govde);
  if (!girdi.gecerliMi(parsed)) throw new OpenAIHatasi("Model geçerli bir JSON yanıtı döndürmedi.");
  return parsed;
}

export async function profilUret(girdi: {
  sistem: string;
  kullanici: string;
}): Promise<FormatProfile> {
  return yapilandirilmisYanit({
    sistem: girdi.sistem,
    kullanici: girdi.kullanici,
    semaAdi: "format_profile",
    sema: FORMAT_PROFILE_JSON_SCHEMA as unknown as Record<string, unknown>,
    effort: "high",
    gecerliMi: profilMi,
  });
}
function profilMi(value: unknown): value is FormatProfile {
  return Boolean(value && typeof value === "object" && "tespit" in value && "kimlik" in value && "ders" in value);
}
function ciktiyiCoz(govde: Record<string, unknown>): unknown {
  if (typeof govde.output_text === "string") {
    return jsonDene(govde.output_text);
  }
  const output = govde.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const blok = item as { type?: string; content?: unknown[] };
    if (blok.type !== "message" || !Array.isArray(blok.content)) continue;
    for (const parca of blok.content) {
      if (!parca || typeof parca !== "object") continue;
      const icerik = parca as { type?: string; text?: string; parsed?: unknown };
      if (icerik.parsed && typeof icerik.parsed === "object") {
        return icerik.parsed;
      }
      if (typeof icerik.text === "string") {
        const aday = jsonDene(icerik.text);
        if (aday) return aday;
      }
    }
  }
  return null;
}
function jsonDene(raw: string): unknown {
  const temiz = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(temiz) as unknown;
  } catch {
    return null;
  }
}

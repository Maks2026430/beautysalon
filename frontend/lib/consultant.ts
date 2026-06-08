// AI consultant questionnaire (spec 5.2) + recommendation client.
// Calls the FastAPI backend; falls back to a local rule-based pick so the
// landing demo works even without the backend running.

import { services, formatPrice } from "@/lib/data";

export type Option = { value: string; label: string };

export type Question = {
  key: "goal" | "area" | "skin_type" | "frequency" | "budget" | "timing";
  title: string;
  options: Option[];
  // If set, the question is only shown when `area` equals one of these values.
  onlyForArea?: string[];
};

export const QUESTIONS: Question[] = [
  {
    key: "goal",
    title: "Какой результат вы хотите получить?",
    options: [
      { value: "omolozhenie", label: "✨ Омоложение и лифтинг" },
      { value: "uvlazhnenie", label: "💧 Увлажнение и питание" },
      { value: "ochishchenie", label: "🌿 Очищение и сужение пор" },
      { value: "vyravnivanie", label: "☀️ Выравнивание тона" },
      { value: "defekty", label: "💪 Устранение дефектов" },
      { value: "rasslabitsa", label: "🧖 Просто расслабиться" },
    ],
  },
  {
    key: "area",
    title: "Какая область вас интересует?",
    options: [
      { value: "litso", label: "🌸 Уход за лицом" },
      { value: "massazh", label: "💆 Массаж тела" },
      { value: "nogti", label: "💅 Маникюр / Педикюр" },
      { value: "volosy", label: "💇 Волосы" },
      { value: "brovi", label: "👁️ Брови / Ресницы" },
      { value: "depilyaciya", label: "🌙 Депиляция" },
    ],
  },
  {
    key: "skin_type",
    title: "Какой у вас тип кожи?",
    onlyForArea: ["litso"],
    options: [
      { value: "sukhaya", label: "🌊 Сухая" },
      { value: "zhirnaya", label: "✨ Жирная" },
      { value: "kombinirovannaya", label: "🌿 Комбинированная" },
      { value: "normalnaya", label: "🌸 Нормальная" },
      { value: "ne_znayu", label: "❓ Не знаю" },
    ],
  },
  {
    key: "frequency",
    title: "Как часто вы бываете в салоне?",
    options: [
      { value: "pervyy", label: "🆕 Первый раз" },
      { value: "mesyac", label: "📅 Раз в месяц" },
      { value: "neskolko", label: "🔄 Несколько раз в месяц" },
      { value: "regulyarno", label: "✅ Регулярно (раз в неделю)" },
    ],
  },
  {
    key: "budget",
    title: "Какой бюджет вам комфортен?",
    options: [
      { value: "do2000", label: "💚 До 2 000 ₽" },
      { value: "2000_5000", label: "💛 2 000 — 5 000 ₽" },
      { value: "5000_10000", label: "🧡 5 000 — 10 000 ₽" },
      { value: "bez", label: "💜 Без ограничений" },
    ],
  },
  {
    key: "timing",
    title: "Когда хотите записаться?",
    options: [
      { value: "segodnya", label: "📅 Сегодня / Завтра" },
      { value: "nedelya", label: "🗓️ На этой неделе" },
      { value: "sled_nedelya", label: "📆 На следующей неделе" },
      { value: "smotryu", label: "🔮 Пока просто смотрю" },
    ],
  },
];

export type Answers = Partial<Record<Question["key"], string>>;

export type Recommendation = {
  procedure_id: string;
  procedure_name: string;
  description: string;
  original_price: number;
  discounted_price: number;
};

export type ConsultResult = {
  session_id: string;
  recommendation: Recommendation;
  discount_percent: number;
  expires_at: string; // ISO
  source: "ai" | "fallback";
};

// Which questions apply given the chosen area (Q3 is face-only).
export function activeQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter(
    (q) => !q.onlyForArea || (answers.area ? q.onlyForArea.includes(answers.area) : true),
  );
}

const SESSION_KEY = "lumiere_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ─── Local fallback (mirrors backend rules) ──────────────────────────
const SERVICE_TAGS: Record<string, { goals: string[]; areas: string[] }> = {
  "facial-ultrasonic": { goals: ["ochishchenie", "uvlazhnenie"], areas: ["litso"] },
  "facial-peel": { goals: ["vyravnivanie", "defekty", "ochishchenie"], areas: ["litso"] },
  "facial-mask": { goals: ["uvlazhnenie", "rasslabitsa"], areas: ["litso"] },
  "hw-carbon": { goals: ["ochishchenie", "vyravnivanie", "defekty"], areas: ["litso"] },
  "hw-rf": { goals: ["omolozhenie"], areas: ["litso"] },
  "hw-ipl": { goals: ["omolozhenie", "vyravnivanie", "defekty"], areas: ["litso"] },
  "massage-body": { goals: ["rasslabitsa"], areas: ["massazh"] },
  "massage-back": { goals: ["rasslabitsa"], areas: ["massazh"] },
  "massage-anticellulite": { goals: ["rasslabitsa", "defekty"], areas: ["massazh"] },
  "nails-manicure": { goals: ["rasslabitsa"], areas: ["nogti"] },
  "nails-pedicure": { goals: ["rasslabitsa", "uvlazhnenie"], areas: ["nogti"] },
  "nails-extension": { goals: ["rasslabitsa"], areas: ["nogti"] },
};

const BUDGET_CEIL: Record<string, number> = {
  do2000: 2000,
  "2000_5000": 5000,
  "5000_10000": 10000,
  bez: Infinity,
};

function localRecommend(answers: Answers): Recommendation {
  const ceiling = BUDGET_CEIL[answers.budget ?? "bez"] ?? Infinity;
  const ranked = [...services].sort((a, b) => {
    const ta = SERVICE_TAGS[a.id] ?? { goals: [], areas: [] };
    const tb = SERVICE_TAGS[b.id] ?? { goals: [], areas: [] };
    const sa: [boolean, boolean, boolean, number] = [
      !!answers.area && ta.areas.includes(answers.area),
      !!answers.goal && ta.goals.includes(answers.goal),
      a.price <= ceiling,
      -a.price,
    ];
    const sb: [boolean, boolean, boolean, number] = [
      !!answers.area && tb.areas.includes(answers.area),
      !!answers.goal && tb.goals.includes(answers.goal),
      b.price <= ceiling,
      -b.price,
    ];
    for (let i = 0; i < 4; i++) {
      const va = Number(sa[i]);
      const vb = Number(sb[i]);
      if (va !== vb) return vb - va; // descending
    }
    return 0;
  });
  const best = ranked[0];
  return {
    procedure_id: best.id,
    procedure_name: best.name,
    description: best.description,
    original_price: best.price,
    discounted_price: Math.round(best.price * 0.8 * 100) / 100,
  };
}

// Read the SSE stream from POST /bot/result and resolve the final `done` event.
// `onChunk` (optional) receives the description word-by-word for a typing effect.
async function streamResult(
  base: string,
  body: object,
  onChunk?: (text: string) => void,
): Promise<ConsultResult> {
  const res = await fetch(`${base}/bot/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`bot_result_${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ConsultResult | null = null;

  // SSE frames are separated by a blank line; each frame has `event:`/`data:` lines.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      if (event === "chunk") onChunk?.((JSON.parse(data) as { text: string }).text);
      else if (event === "done") result = JSON.parse(data) as ConsultResult;
    }
  }

  if (!result) throw new Error("bot_result_incomplete");
  return result;
}

// Free-text chat: POST /bot/chat, stream the reply via SSE `chunk` events.
// `onChunk` receives text pieces as they arrive for a live typing effect.
export async function streamChat(
  message: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const session_id = getSessionId();

  if (!base) {
    onChunk(
      "Чат сейчас недоступен. Попробуйте подбор процедуры кнопкой «Начать подбор».",
    );
    return;
  }

  const res = await fetch(`${base}/bot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, message }),
  });
  if (!res.ok || !res.body) throw new Error(`bot_chat_${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data && event === "chunk") onChunk((JSON.parse(data) as { text: string }).text);
    }
  }
}

export async function getRecommendation(
  answers: Answers,
  onChunk?: (text: string) => void,
): Promise<ConsultResult> {
  const session_id = getSessionId();
  const base = process.env.NEXT_PUBLIC_API_URL;

  if (base) {
    try {
      return await streamResult(base, { ...answers, session_id }, onChunk);
    } catch {
      // fall through to local fallback
    }
  }

  // Offline fallback: 48h offer computed client-side.
  return {
    session_id,
    recommendation: localRecommend(answers),
    discount_percent: 20,
    expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    source: "fallback",
  };
}

export { formatPrice };

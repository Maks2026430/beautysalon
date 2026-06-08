"""AI consultant: recommends one salon procedure from the 6 questionnaire answers.

Design notes:
- Backed by OpenAI (gpt-4o-mini) via the Chat Completions API.
- Structured outputs (`response_format` json_schema, strict) for a guaranteed-shape
  JSON card — more reliable than tool use for a single fixed object.
- No streaming: the payload is one short JSON object; streaming buys nothing here.
- The static instructions + price list live in the system message; the per-user
  answers go in the user message. OpenAI caches long, stable prefixes automatically.
- Price integrity: the model only chooses `procedure_id`; price + discount are taken
  from our own price list, never from the model.
"""
import json
import logging
from typing import Iterator

from app.core.config import settings
from app.services import price_list
from app.schemas.consultant import ConsultAnswers, Recommendation

logger = logging.getLogger(__name__)

DISCOUNT_PERCENT = 20

SYSTEM_INSTRUCTIONS = """Ты — вежливый и вовлекающий консультант бьюти-салона. Твоя задача — \
помочь клиенту выбрать идеальную процедуру на основе его потребностей.

Правила:
- Общайся на русском языке, обращайся на «вы».
- Будь тёплым, но профессиональным.
- Не предлагай процедуры, которых нет в прайс-листе.
- Выбирай процедуру исходя из цели, типа кожи, области и бюджета клиента.
- В описании процедуры подчеркни, как именно она решит задачу клиента (2–3 предложения).

Верни строго JSON по заданной схеме. Поле procedure_id ДОЛЖНО точно совпадать с \
полем "id" одной из процедур прайс-листа. Поля original_price и discounted_price \
бери из прайс-листа (discounted_price = original_price минус 20%)."""

# Static, deterministic system block → cache-friendly.
_SYSTEM_TEXT = (
    SYSTEM_INSTRUCTIONS
    + "\n\nПрайс-лист салона (JSON):\n"
    + price_list.PRICE_LIST_JSON
)

RECOMMENDATION_SCHEMA = {
    "type": "object",
    "properties": {
        "procedure_id": {"type": "string"},
        "procedure_name": {"type": "string"},
        "description": {"type": "string"},
        "original_price": {"type": "number"},
        "discounted_price": {"type": "number"},
    },
    "required": [
        "procedure_id",
        "procedure_name",
        "description",
        "original_price",
        "discounted_price",
    ],
    "additionalProperties": False,
}

# Human-readable labels for building the user turn.
_GOAL_LABELS = {
    "omolozhenie": "Омоложение и лифтинг",
    "uvlazhnenie": "Увлажнение и питание",
    "ochishchenie": "Очищение и сужение пор",
    "vyravnivanie": "Выравнивание тона",
    "defekty": "Устранение дефектов",
    "rasslabitsa": "Просто расслабиться",
}
_AREA_LABELS = {
    "litso": "Уход за лицом",
    "massazh": "Массаж тела",
    "nogti": "Маникюр / Педикюр",
    "volosy": "Волосы",
    "brovi": "Брови / Ресницы",
    "depilyaciya": "Депиляция",
}
_SKIN_LABELS = {
    "sukhaya": "Сухая",
    "zhirnaya": "Жирная",
    "kombinirovannaya": "Комбинированная",
    "normalnaya": "Нормальная",
    "ne_znayu": "Не знаю",
}
_FREQ_LABELS = {
    "pervyy": "Первый раз",
    "mesyac": "Раз в месяц",
    "neskolko": "Несколько раз в месяц",
    "regulyarno": "Регулярно (раз в неделю)",
}
_BUDGET_LABELS = {
    "do2000": "До 2 000 ₽",
    "2000_5000": "2 000 — 5 000 ₽",
    "5000_10000": "5 000 — 10 000 ₽",
    "bez": "Без ограничений",
}
_TIMING_LABELS = {
    "segodnya": "Сегодня / Завтра",
    "nedelya": "На этой неделе",
    "sled_nedelya": "На следующей неделе",
    "smotryu": "Пока просто смотрю",
}

_BUDGET_CEILING = {"do2000": 2000, "2000_5000": 5000, "5000_10000": 10000, "bez": 10**9}


def _user_turn(a: ConsultAnswers) -> str:
    lines = [
        "Ответы клиента:",
        f"- Цель: {_GOAL_LABELS.get(a.goal, a.goal)}",
        f"- Область: {_AREA_LABELS.get(a.area, a.area)}",
    ]
    if a.skin_type:
        lines.append(f"- Тип кожи: {_SKIN_LABELS.get(a.skin_type, a.skin_type)}")
    lines += [
        f"- Частота посещений: {_FREQ_LABELS.get(a.frequency, a.frequency)}",
        f"- Бюджет: {_BUDGET_LABELS.get(a.budget, a.budget)}",
        f"- Удобное время: {_TIMING_LABELS.get(a.timing, a.timing)}",
        "",
        "Подберите одну наиболее подходящую процедуру и верните JSON по схеме.",
    ]
    return "\n".join(lines)


def _discounted(price: float) -> float:
    return round(price * (100 - DISCOUNT_PERCENT) / 100, 2)


def _finalize(procedure_id: str, description: str) -> Recommendation:
    """Build the recommendation from authoritative price-list data."""
    svc = price_list.get_service(procedure_id)
    if svc is None:  # model returned an unknown id — caller handles fallback
        raise KeyError(procedure_id)
    price = float(svc["price"])
    return Recommendation(
        procedure_id=svc["id"],
        procedure_name=svc["name"],
        description=description.strip() or svc["description"],
        original_price=price,
        discounted_price=_discounted(price),
    )


def _fallback(a: ConsultAnswers) -> Recommendation:
    """Deterministic rule-based pick — used when no API key is set or the model fails.

    Keeps the learning project fully functional offline. Scores by area match,
    goal match, and budget fit.
    """
    ceiling = _BUDGET_CEILING.get(a.budget, 10**9)

    def score(svc: dict) -> tuple:
        area_match = a.area in svc.get("areas", [])
        goal_match = a.goal in svc.get("goals", [])
        within_budget = svc["price"] <= ceiling
        # Prefer area, then goal, then budget fit, then a cheaper price as tiebreak.
        return (area_match, goal_match, within_budget, -svc["price"])

    best = max(price_list.SERVICES, key=score)
    desc = (
        f"{best['description']} Отличный выбор для цели «"
        f"{_GOAL_LABELS.get(a.goal, a.goal)}»."
    )
    price = float(best["price"])
    return Recommendation(
        procedure_id=best["id"],
        procedure_name=best["name"],
        description=desc,
        original_price=price,
        discounted_price=_discounted(price),
    )


_client = None


def _get_client():
    """Lazily build the OpenAI client so import never fails without a key.

    Honors OPENAI_BASE_URL so an OpenAI-compatible gateway (e.g. ProxyAPI) can be
    used with the same key + Bearer auth.
    """
    global _client
    if _client is None:
        from openai import OpenAI

        _client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL or None,
        )
    return _client


def recommend(answers: ConsultAnswers) -> tuple[Recommendation, str]:
    """Return (recommendation, source) where source is 'ai' or 'fallback'."""
    if not settings.OPENAI_API_KEY:
        return _fallback(answers), "fallback"

    try:
        client = _get_client()
        resp = client.chat.completions.create(
            model=settings.OPENAI_MODEL,  # gpt-4o-mini
            max_tokens=600,
            messages=[
                {"role": "system", "content": _SYSTEM_TEXT},
                {"role": "user", "content": _user_turn(answers)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "recommendation",
                    "strict": True,
                    "schema": RECOMMENDATION_SCHEMA,
                },
            },
        )

        usage = getattr(resp, "usage", None)
        if usage is not None:
            logger.info(
                "consultant tokens in=%s out=%s",
                getattr(usage, "prompt_tokens", "?"),
                getattr(usage, "completion_tokens", "?"),
            )

        choice = resp.choices[0]
        if choice.message.refusal:
            logger.warning("consultant: model refused, using fallback")
            return _fallback(answers), "fallback"

        data = json.loads(choice.message.content)
        rec = _finalize(data["procedure_id"], data.get("description", ""))
        return rec, "ai"
    except Exception:  # noqa: BLE001 — never fail the request over the model
        logger.exception("consultant: AI recommendation failed, using fallback")
        return _fallback(answers), "fallback"


# ─── Free-text conversational assistant ──────────────────────────────
# Unlike recommend() (a one-shot structured pick), this is a multi-turn chat:
# the visitor asks anything in their own words and the model answers, grounded
# in the salon's real data so it never invents prices, services, hours, etc.

# Mirrors frontend/lib/data.ts `salon`. Static → cache-friendly system prefix.
SALON_INFO = """Информация о салоне «Lumière»:
- Адрес: Москва, ул. Пречистенка, 12, БЦ «Аврора», 2 этаж.
- Часы работы: ежедневно с 9:00 до 21:00.
- Телефон: +7 (495) 123-45-67.
- Скидка 20% на первое посещение (оформляется при подборе процедуры в этом чате).
- Мастера: Анна Северова (косметолог-эстетист), Марина Дольская (аппаратная \
косметология), Ирина Власова (массажист), Екатерина Лиман (ногтевой сервис), \
София Зеленова (стилист-парикмахер, окрашивания), Полина Зорина (брови и ресницы), \
Алина Морозова (депиляция)."""

CHAT_INSTRUCTIONS = """Ты — Lumière, дружелюбный AI-консультант одноимённого бьюти-салона. \
Помогаешь гостям: рассказываешь о процедурах, ценах, подготовке и уходе, советуешь \
процедуру под запрос и помогаешь записаться.

Правила:
- Отвечай на русском, обращайся на «вы», тепло и по-человечески, без канцелярита.
- Давай содержательный, но не раздутый ответ: обычно 2–5 предложений. Если гость \
просит объяснить процедуру или сравнить варианты — раскрой подробнее (можно \
короткий список), если вопрос простой (цена, часы) — ответь кратко.
- НЕ заканчивай ответы дежурными фразами вроде «дайте знать», «дайте знать, если \
будут вопросы», «обращайтесь». Не повторяй из ответа в ответ одну и ту же концовку. \
Если уместно завершить — задай конкретный уточняющий вопрос по теме.
- Опирайся ТОЛЬКО на данные салона и прайс-лист ниже — не выдумывай цены, услуги, \
часы работы, адрес, имена мастеров.
- Если спрашивают про услугу или цену, которой нет в прайсе, — честно скажи, что \
её нет, и предложи близкую из списка.
- Можешь объяснять процедуры: как проходит, как подготовиться, уход после, общие \
противопоказания. Но ты не врач: не ставь диагнозов, при жалобах на здоровье \
советуй очную консультацию специалиста.
- Помогай записаться: предлагай подходящую процедуру, напоминай про скидку 20% на \
первое посещение. Запись оформляется кнопкой «Записаться» на сайте.
- Если вопрос не про салон, красоту или уход за собой — мягко верни разговор к \
услугам салона.
- Не давай гарантий результата и медицинских/лекарственных назначений."""

_CHAT_SYSTEM_TEXT = (
    CHAT_INSTRUCTIONS
    + "\n\n"
    + SALON_INFO
    + "\n\nПрайс-лист салона (JSON):\n"
    + price_list.PRICE_LIST_JSON
)

_CHAT_FALLBACK = (
    "Извините, сейчас я не могу ответить подробно. Подобрать процедуру можно кнопкой "
    "«Начать подбор», а записаться — на сайте. Чем ещё могу помочь?"
)


def stream_chat(history: list[dict], message: str) -> Iterator[str]:
    """Yield the assistant reply in text pieces for a progressive typing effect.

    `history` is prior turns ([{role, content}, ...]); `message` is the new user
    turn. Falls back to a canned reply when no API key is set or the model errors,
    so the chat never hard-fails.
    """
    if not settings.OPENAI_API_KEY:
        yield _CHAT_FALLBACK
        return

    messages = (
        [{"role": "system", "content": _CHAT_SYSTEM_TEXT}]
        + history
        + [{"role": "user", "content": message}]
    )
    try:
        client = _get_client()
        stream = client.chat.completions.create(
            model=settings.OPENAI_MODEL,  # gpt-4o-mini
            max_tokens=700,
            temperature=0.6,
            messages=messages,
            stream=True,
        )
        produced = False
        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                produced = True
                yield delta
        if not produced:
            yield _CHAT_FALLBACK
    except Exception:  # noqa: BLE001 — never fail the request over the model
        logger.exception("chat: AI reply failed, using fallback")
        yield _CHAT_FALLBACK

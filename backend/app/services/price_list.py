"""Single source of truth for the salon price list used by the AI consultant.

Mirrors frontend/lib/data.ts. Prices follow the real «Город красоты» price list.
Kept as a static module so the system prompt stays byte-stable for prompt caching
(see ai_consultant.py). When a real `services` table is seeded, this can be
replaced by a DB query — but the consultant always treats these prices as
authoritative and never trusts a model-emitted price.
"""
import json
from typing import Optional

# Category labels match the bot questionnaire's "area" buttons.
SERVICES: list[dict] = [
    {
        "id": "facial-ultrasonic",
        "name": "Ультразвуковая чистка лица",
        "category": "Уход за лицом",
        "description": "Бережное очищение ультразвуком, тонизирование и увлажняющая маска по типу кожи.",
        "price": 2550,
        "duration_minutes": 60,
        "goals": ["ochishchenie", "uvlazhnenie"],
        "areas": ["litso"],
    },
    {
        "id": "facial-peel",
        "name": "Химический пилинг",
        "category": "Уход за лицом",
        "description": "Обновление и выравнивание тона кожи срединным пилингом нового поколения.",
        "price": 2500,
        "duration_minutes": 60,
        "goals": ["vyravnivanie", "defekty", "ochishchenie"],
        "areas": ["litso"],
    },
    {
        "id": "facial-mask",
        "name": "Уходовая SPA-маска для лица",
        "category": "Уход за лицом",
        "description": "Питательный уход с массажем по массажным линиям и финишной сывороткой.",
        "price": 950,
        "duration_minutes": 40,
        "goals": ["uvlazhnenie", "rasslabitsa"],
        "areas": ["litso"],
    },
    {
        "id": "hw-carbon",
        "name": "Карбоновый пилинг",
        "category": "Аппаратная косметология",
        "description": "Лазерное обновление кожи: сужает поры, выравнивает тон и матирует.",
        "price": 3100,
        "duration_minutes": 45,
        "goals": ["ochishchenie", "vyravnivanie", "defekty"],
        "areas": ["litso"],
    },
    {
        "id": "hw-rf",
        "name": "RF-лифтинг лица",
        "category": "Аппаратная косметология",
        "description": "Радиочастотный лифтинг для подтяжки овала и упругости кожи.",
        "price": 2200,
        "duration_minutes": 50,
        "goals": ["omolozhenie"],
        "areas": ["litso"],
    },
    {
        "id": "hw-ipl",
        "name": "IPL-фотоомоложение",
        "category": "Аппаратная косметология",
        "description": "Световое омоложение: убирает пигментацию и сосудистые звёздочки.",
        "price": 1900,
        "duration_minutes": 40,
        "goals": ["omolozhenie", "vyravnivanie", "defekty"],
        "areas": ["litso"],
    },
    {
        "id": "massage-body",
        "name": "Общий массаж тела",
        "category": "Массаж",
        "description": "Расслабляющий массаж всего тела с аромамаслами ручной работы.",
        "price": 2950,
        "duration_minutes": 90,
        "goals": ["rasslabitsa"],
        "areas": ["massazh"],
    },
    {
        "id": "massage-back",
        "name": "Массаж спины",
        "category": "Массаж",
        "description": "Снимает напряжение и зажимы в шейно-воротниковой зоне и спине.",
        "price": 1800,
        "duration_minutes": 40,
        "goals": ["rasslabitsa"],
        "areas": ["massazh"],
    },
    {
        "id": "massage-anticellulite",
        "name": "Антицеллюлитный массаж",
        "category": "Массаж",
        "description": "Интенсивная проработка проблемных зон для упругости кожи и гладкого рельефа.",
        "price": 2700,
        "duration_minutes": 60,
        "goals": ["rasslabitsa", "defekty"],
        "areas": ["massazh"],
    },
    {
        "id": "nails-manicure",
        "name": "Маникюр с гель-лаком",
        "category": "Ногтевой сервис",
        "description": "Аппаратный маникюр, уход за кутикулой и стойкое гель-покрытие.",
        "price": 1900,
        "duration_minutes": 90,
        "goals": ["rasslabitsa"],
        "areas": ["nogti"],
    },
    {
        "id": "nails-pedicure",
        "name": "СПА-педикюр с покрытием",
        "category": "Ногтевой сервис",
        "description": "Ванночка, пилинг, питательный уход и стойкое покрытие для безупречных стоп.",
        "price": 2400,
        "duration_minutes": 100,
        "goals": ["rasslabitsa", "uvlazhnenie"],
        "areas": ["nogti"],
    },
    {
        "id": "nails-extension",
        "name": "Наращивание ногтей",
        "category": "Ногтевой сервис",
        "description": "Моделирование и наращивание ногтей любой длины с прочным дизайнерским покрытием.",
        "price": 2800,
        "duration_minutes": 120,
        "goals": ["rasslabitsa"],
        "areas": ["nogti"],
    },
    {
        "id": "hair-cut-women",
        "name": "Женская стрижка и укладка",
        "category": "Волосы и причёски",
        "description": "Стрижка с учётом структуры волос и формы лица, финишная укладка феном.",
        "price": 1900,
        "duration_minutes": 75,
        "goals": ["rasslabitsa"],
        "areas": ["volosy"],
    },
    {
        "id": "hair-cut-men",
        "name": "Мужская стрижка",
        "category": "Волосы и причёски",
        "description": "Модельная стрижка, моделирование контуров и укладка под стиль клиента.",
        "price": 1200,
        "duration_minutes": 45,
        "goals": ["rasslabitsa"],
        "areas": ["volosy"],
    },
    {
        "id": "hair-color",
        "name": "Окрашивание волос",
        "category": "Волосы и причёски",
        "description": "Однотонное окрашивание стойким красителем с уходовым составом и укладкой.",
        "price": 3900,
        "duration_minutes": 150,
        "goals": ["vyravnivanie"],
        "areas": ["volosy"],
    },
    {
        "id": "hair-styling",
        "name": "Вечерняя укладка",
        "category": "Волосы и причёски",
        "description": "Праздничная укладка или локоны для особого случая с долговременной фиксацией.",
        "price": 1800,
        "duration_minutes": 60,
        "goals": ["rasslabitsa"],
        "areas": ["volosy"],
    },
    {
        "id": "hair-treatment",
        "name": "Ламинирование волос",
        "category": "Волосы и причёски",
        "description": "Глубокое восстановление и блеск: разглаживает, питает и облегчает укладку.",
        "price": 2900,
        "duration_minutes": 90,
        "goals": ["uvlazhnenie"],
        "areas": ["volosy"],
    },
    {
        "id": "brows-correction",
        "name": "Коррекция и окрашивание бровей",
        "category": "Брови и ресницы",
        "description": "Моделирование формы по типу лица и стойкое окрашивание краской или хной.",
        "price": 900,
        "duration_minutes": 40,
        "goals": ["rasslabitsa"],
        "areas": ["brovi"],
    },
    {
        "id": "brows-lamination",
        "name": "Ламинирование бровей",
        "category": "Брови и ресницы",
        "description": "Фиксация формы, питание и ухоженный вид бровей на несколько недель.",
        "price": 2000,
        "duration_minutes": 60,
        "goals": ["rasslabitsa"],
        "areas": ["brovi"],
    },
    {
        "id": "lashes-lamination",
        "name": "Ламинирование ресниц",
        "category": "Брови и ресницы",
        "description": "Изгиб, объём и стойкий уход без наращивания — естественный взгляд.",
        "price": 2300,
        "duration_minutes": 70,
        "goals": ["rasslabitsa"],
        "areas": ["brovi"],
    },
    {
        "id": "lashes-extension",
        "name": "Наращивание ресниц",
        "category": "Брови и ресницы",
        "description": "Классическое или объёмное наращивание для выразительного взгляда.",
        "price": 2600,
        "duration_minutes": 120,
        "goals": ["rasslabitsa"],
        "areas": ["brovi"],
    },
    {
        "id": "depil-underarms",
        "name": "Депиляция подмышек",
        "category": "Депиляция",
        "description": "Бережное удаление волос воском или сахарной пастой с гладким результатом.",
        "price": 700,
        "duration_minutes": 30,
        "goals": ["rasslabitsa"],
        "areas": ["depilyaciya"],
    },
    {
        "id": "depil-bikini",
        "name": "Депиляция зоны бикини",
        "category": "Депиляция",
        "description": "Деликатная депиляция с уходовыми составами и финишным успокаивающим кремом.",
        "price": 1600,
        "duration_minutes": 45,
        "goals": ["rasslabitsa"],
        "areas": ["depilyaciya"],
    },
    {
        "id": "depil-legs",
        "name": "Депиляция ног полностью",
        "category": "Депиляция",
        "description": "Гладкая кожа ног надолго — воск или шугаринг по всей длине.",
        "price": 2200,
        "duration_minutes": 60,
        "goals": ["rasslabitsa"],
        "areas": ["depilyaciya"],
    },
    {
        "id": "depil-full",
        "name": "Комплексная депиляция тела",
        "category": "Депиляция",
        "description": "Полный комплекс зон со скидкой за пакет: ноги, руки, бикини и подмышки.",
        "price": 3800,
        "duration_minutes": 100,
        "goals": ["rasslabitsa"],
        "areas": ["depilyaciya"],
    },
]

_BY_ID = {s["id"]: s for s in SERVICES}


def get_service(procedure_id: str) -> Optional[dict]:
    return _BY_ID.get(procedure_id)


def all_ids() -> list[str]:
    return list(_BY_ID.keys())


def _pricing_view() -> list[dict]:
    """The slice of fields Claude needs to choose a procedure (no internal tags)."""
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "category": s["category"],
            "description": s["description"],
            "price": s["price"],
            "duration_minutes": s["duration_minutes"],
        }
        for s in SERVICES
    ]


# Built once at import, deterministic ordering → byte-stable for prompt caching.
PRICE_LIST_JSON: str = json.dumps(_pricing_view(), ensure_ascii=False, indent=2)

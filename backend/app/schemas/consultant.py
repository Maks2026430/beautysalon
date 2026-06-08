from datetime import datetime

from pydantic import BaseModel, Field


class ConsultAnswers(BaseModel):
    """The 6 button-driven answers from the bot questionnaire (5.2 in spec).

    Values are the short option keys; the human-readable Russian labels are
    rebuilt server-side when prompting Claude so the frontend can send compact
    payloads.
    """

    goal: str = Field(..., description="omolozhenie|uvlazhnenie|ochishchenie|vyravnivanie|defekty|rasslabitsa")
    area: str = Field(..., description="litso|massazh|nogti|volosy|brovi|depilyaciya")
    skin_type: str | None = Field(None, description="sukhaya|zhirnaya|kombinirovannaya|normalnaya|ne_znayu")
    frequency: str = Field(..., description="pervyy|mesyac|neskolko|regulyarno")
    budget: str = Field(..., description="do2000|2000_5000|5000_10000|bez")
    timing: str = Field(..., description="segodnya|nedelya|sled_nedelya|smotryu")
    session_id: str | None = Field(None, description="Browser session id; generated if absent")


class Recommendation(BaseModel):
    procedure_id: str
    procedure_name: str
    description: str
    original_price: float
    discounted_price: float


class ConsultResponse(BaseModel):
    session_id: str
    recommendation: Recommendation
    discount_percent: int = 20
    expires_at: datetime
    source: str = Field("ai", description="'ai' when Claude chose, 'fallback' when rule-based")


class OfferState(BaseModel):
    """Returned by GET /bot/offer/{session_id} so the 48h timer can
    resume on re-entry (5.5)."""

    session_id: str
    recommendation: Recommendation
    discount_percent: int = 20
    expires_at: datetime
    expired: bool


# ─── Step-by-step bot flow ───────────────────────────────────────────
class BotStartResponse(BaseModel):
    session_id: str
    next_question: str | None = Field(None, description="Key of the first question")


class BotAnswerRequest(BaseModel):
    session_id: str
    key: str = Field(..., description="goal|area|skin_type|frequency|budget|timing")
    value: str


class BotAnswerResponse(BaseModel):
    session_id: str
    accepted: str
    next_question: str | None
    complete: bool


class DiscountState(BaseModel):
    """Active discount offer for an authenticated user (GET /bot/discount/{user_id})."""

    active: bool
    service_id: str | None = None
    service_name: str | None = None
    discount_percent: int = 20
    expires_at: datetime | None = None


class BotChatRequest(BaseModel):
    """One turn of the free-text conversational assistant (POST /bot/chat).

    History is kept server-side in Redis keyed by session_id, so the client only
    sends the latest message.
    """

    session_id: str | None = Field(None, description="Browser session id; generated if absent")
    message: str = Field(..., min_length=1, max_length=1000)


class BotClaimRequest(BaseModel):
    """Claim the bot's offer for the logged-in user (POST /bot/discount/claim).

    Prefer `session_id` (reads the live Redis offer); `procedure_id` is a fallback
    when the Redis offer has already expired but the client still holds it locally.
    """

    session_id: str | None = None
    procedure_id: str | None = None

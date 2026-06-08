"""AI bot endpoints (spec 5).

POST /bot/start            — begin a session (funnel stat), return the first question.
POST /bot/answer           — submit one answer, get the next question key.
POST /bot/result           — run the questionnaire and stream the recommendation (SSE).
GET  /bot/offer/{session}  — fetch the anonymous offer so the 48h timer resumes (5.5).
GET  /bot/discount/{user}  — active discount offer for an authenticated user.

The recommendation lives in Redis for anonymous users (offer:{session_id}, 48h TTL);
once persisted to the `discount_offers` table it is also keyed by user_id.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_client
from app.core.redis import redis_client
from app.models import DiscountOffer, Service, User
from app.schemas.consultant import (
    BotAnswerRequest,
    BotAnswerResponse,
    BotChatRequest,
    BotClaimRequest,
    BotStartResponse,
    ConsultAnswers,
    ConsultResponse,
    DiscountState,
    OfferState,
    Recommendation,
)
from app.services import ai_consultant
from app.services.stats import funnel_incr

router = APIRouter(prefix="/bot", tags=["bot"])

CHAT_TTL = 2 * 60 * 60          # 2 hours  (spec 5.1)
STATE_TTL = 2 * 60 * 60         # partial answers, same window
OFFER_TTL = 48 * 60 * 60        # 48 hours (spec 5.5)
CHATLOG_TTL = 2 * 60 * 60       # free-text conversation history window
MAX_HISTORY = 12                # keep last N messages (6 turns) per session
DISCOUNT_PERCENT = ai_consultant.DISCOUNT_PERCENT

# Server-side mirror of the questionnaire order (spec 5.2). skin_type is asked
# only for face procedures.
QUESTION_ORDER = ["goal", "area", "skin_type", "frequency", "budget", "timing"]


def _chat_key(session_id: str) -> str:
    return f"chat:{session_id}"


def _offer_key(session_id: str) -> str:
    return f"offer:{session_id}"


def _state_key(session_id: str) -> str:
    return f"botstate:{session_id}"


def _chatlog_key(session_id: str) -> str:
    return f"chatlog:{session_id}"


def _next_question(answers: dict) -> str | None:
    for key in QUESTION_ORDER:
        if key == "skin_type" and answers.get("area") != "litso":
            continue
        if not answers.get(key):
            return key
    return None


# ─── Session flow ────────────────────────────────────────────────────
@router.post("/start", response_model=BotStartResponse)
def start_session(body: dict | None = None) -> BotStartResponse:
    session_id = (body or {}).get("session_id") or uuid.uuid4().hex
    redis_client.delete(_state_key(session_id))
    funnel_incr("started")
    return BotStartResponse(session_id=session_id, next_question=QUESTION_ORDER[0])


@router.post("/answer", response_model=BotAnswerResponse)
def answer(body: BotAnswerRequest) -> BotAnswerResponse:
    if body.key not in QUESTION_ORDER:
        raise HTTPException(status_code=400, detail="unknown_question")

    raw = redis_client.get(_state_key(body.session_id))
    answers = json.loads(raw) if raw else {}
    answers[body.key] = body.value
    redis_client.set(_state_key(body.session_id), json.dumps(answers), ex=STATE_TTL)

    nxt = _next_question(answers)
    return BotAnswerResponse(
        session_id=body.session_id,
        accepted=body.key,
        next_question=nxt,
        complete=nxt is None,
    )


# ─── Result (streamed) ───────────────────────────────────────────────
def _persist_offer(session_id: str, recommendation: Recommendation) -> datetime:
    """Store the offer + chat session in Redis, reusing an unexpired offer's
    expiry so the 48h timer doesn't reset on re-entry. Returns expires_at."""
    now = datetime.now(timezone.utc)
    existing = redis_client.get(_offer_key(session_id))
    if existing:
        expires_at = datetime.fromisoformat(json.loads(existing)["expires_at"])
        ttl = max(int((expires_at - now).total_seconds()), 1)
    else:
        expires_at = now + timedelta(seconds=OFFER_TTL)
        ttl = OFFER_TTL

    payload = {
        "recommendation": recommendation.model_dump(),
        "expires_at": expires_at.isoformat(),
        "discount_percent": DISCOUNT_PERCENT,
    }
    redis_client.set(_offer_key(session_id), json.dumps(payload), ex=ttl)
    redis_client.set(_chat_key(session_id), json.dumps(payload), ex=CHAT_TTL)
    return expires_at


@router.post("/result")
def result(answers: ConsultAnswers) -> StreamingResponse:
    """Stream the recommendation as Server-Sent Events.

    Emits `chunk` events with the description word-by-word for a progressive
    typing effect, then a final `done` event carrying the full ConsultResponse.
    Price/discount come from our price list (see ai_consultant), never the model.
    """
    session_id = answers.session_id or uuid.uuid4().hex

    def event_stream():
        recommendation, source = ai_consultant.recommend(answers)
        funnel_incr("completed")
        expires_at = _persist_offer(session_id, recommendation)

        for word in recommendation.description.split(" "):
            yield f"event: chunk\ndata: {json.dumps({'text': word + ' '})}\n\n"

        final = ConsultResponse(
            session_id=session_id,
            recommendation=recommendation,
            discount_percent=DISCOUNT_PERCENT,
            expires_at=expires_at,
            source=source,
        )
        yield f"event: done\ndata: {final.model_dump_json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Free-text chat (streamed) ───────────────────────────────────────
@router.post("/chat")
def chat(body: BotChatRequest) -> StreamingResponse:
    """Conversational assistant. Streams the reply as SSE `chunk` events, then a
    `done` event with the session id. Multi-turn history is kept in Redis
    (chatlog:{session_id}) so the client only sends the latest message."""
    session_id = body.session_id or uuid.uuid4().hex
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="empty_message")

    raw = redis_client.get(_chatlog_key(session_id))
    history = json.loads(raw) if raw else []

    def event_stream():
        pieces: list[str] = []
        for piece in ai_consultant.stream_chat(history, message):
            pieces.append(piece)
            yield f"event: chunk\ndata: {json.dumps({'text': piece})}\n\n"

        reply = "".join(pieces)
        new_history = (
            history
            + [{"role": "user", "content": message}, {"role": "assistant", "content": reply}]
        )[-MAX_HISTORY:]
        redis_client.set(
            _chatlog_key(session_id),
            json.dumps(new_history, ensure_ascii=False),
            ex=CHATLOG_TTL,
        )
        yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Offers ──────────────────────────────────────────────────────────
@router.get("/offer/{session_id}", response_model=OfferState)
def get_offer(session_id: str) -> OfferState:
    raw = redis_client.get(_offer_key(session_id))
    if not raw:
        raise HTTPException(status_code=404, detail="offer_not_found")

    data = json.loads(raw)
    expires_at = datetime.fromisoformat(data["expires_at"])
    return OfferState(
        session_id=session_id,
        recommendation=Recommendation(**data["recommendation"]),
        discount_percent=data.get("discount_percent", DISCOUNT_PERCENT),
        expires_at=expires_at,
        expired=datetime.now(timezone.utc) >= expires_at,
    )


@router.post("/discount/claim", response_model=DiscountState)
def claim_discount(
    body: BotClaimRequest,
    user: User = Depends(get_current_client),
    db: Session = Depends(get_db),
) -> DiscountState:
    """Persist the bot's offer (Redis) into the `discount_offers` table for the
    logged-in user. Idempotent: an existing active offer for the same service is
    reused rather than duplicated."""
    procedure_id = body.procedure_id
    expires_at: datetime | None = None

    # Prefer the live Redis offer (carries the original 48h expiry).
    if body.session_id:
        raw = redis_client.get(_offer_key(body.session_id))
        if raw:
            data = json.loads(raw)
            procedure_id = data["recommendation"]["procedure_id"]
            # Stored tz-aware ISO → naive UTC to match the rest of the schema.
            expires_at = datetime.fromisoformat(data["expires_at"]).astimezone(
                timezone.utc
            ).replace(tzinfo=None)

    if not procedure_id:
        raise HTTPException(status_code=400, detail="no_offer")
    if expires_at is None:
        expires_at = datetime.utcnow() + timedelta(seconds=OFFER_TTL)

    service = db.scalar(select(Service).where(Service.slug == procedure_id))
    if service is None:
        raise HTTPException(status_code=404, detail="service_not_found")

    now = datetime.utcnow()
    offer = db.scalar(
        select(DiscountOffer)
        .where(
            DiscountOffer.user_id == user.id,
            DiscountOffer.service_id == service.id,
            DiscountOffer.used.is_(False),
            DiscountOffer.expires_at > now,
        )
        .order_by(DiscountOffer.created_at.desc())
        .limit(1)
    )
    if offer is None:
        offer = DiscountOffer(user_id=user.id, service_id=service.id, expires_at=expires_at)
        db.add(offer)
        db.commit()
        db.refresh(offer)

    return DiscountState(
        active=True,
        service_id=str(service.id),
        service_name=service.name,
        discount_percent=DISCOUNT_PERCENT,
        expires_at=offer.expires_at,
    )


@router.get("/discount/{user_id}", response_model=DiscountState)
def get_discount(user_id: str, db: Session = Depends(get_db)) -> DiscountState:
    """Active (unused, unexpired) discount offer for an authenticated user."""
    row = db.scalar(
        select(DiscountOffer)
        .where(
            DiscountOffer.user_id == user_id,
            DiscountOffer.used.is_(False),
            DiscountOffer.expires_at > datetime.utcnow(),
        )
        .order_by(DiscountOffer.created_at.desc())
        .limit(1)
    )
    if row is None:
        return DiscountState(active=False)
    svc = db.get(Service, row.service_id)
    return DiscountState(
        active=True,
        service_id=str(row.service_id),
        service_name=svc.name if svc else None,
        discount_percent=DISCOUNT_PERCENT,
        expires_at=row.expires_at,
    )

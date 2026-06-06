import redis

from app.core.config import settings

# Sync client; decode_responses so we work with str, not bytes.
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

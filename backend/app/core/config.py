from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database / cache
    DATABASE_URL: str = "postgresql://user:pass@db:5432/beauty_salon"
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    JWT_SECRET: str = "change_me"
    JWT_ACCESS_TTL: int = 900
    JWT_REFRESH_TTL: int = 2592000

    # OpenAI (or any OpenAI-compatible gateway, e.g. ProxyAPI)
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    # Custom API base, e.g. https://api.proxyapi.ru/openai/v1. Empty = official OpenAI.
    OPENAI_BASE_URL: str | None = None

    # SMS
    SMSC_LOGIN: str | None = None
    SMSC_PASSWORD: str | None = None
    SMSC_SENDER: str = "BeautySalon"

    # Payment
    YOOKASSA_SHOP_ID: str | None = None
    YOOKASSA_SECRET_KEY: str | None = None

    # Storage
    CLOUDFLARE_R2_ACCOUNT_ID: str | None = None
    CLOUDFLARE_R2_ACCESS_KEY: str | None = None
    CLOUDFLARE_R2_SECRET_KEY: str | None = None
    CLOUDFLARE_R2_BUCKET: str = "beauty-salon"

    # App
    NEXT_PUBLIC_API_URL: str | None = None
    FRONTEND_URL: str | None = None

    # OTP (client phone login)
    OTP_TTL: int = 300       # 5 min
    OTP_LENGTH: int = 4

    # Refresh-token cookie. Set COOKIE_SECURE=true behind HTTPS (production).
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Initial admin (created by seed.py if missing)
    ADMIN_EMAIL: str = "admin@lumiere-salon.ru"
    ADMIN_PASSWORD: str = "admin12345"
    ADMIN_NAME: str = "Администратор"

    @property
    def sms_enabled(self) -> bool:
        return bool(self.SMSC_LOGIN and self.SMSC_PASSWORD)


settings = Settings()

# ============================================================
# BusinessAIOS - core/config.py
# v1.0.0 FIXED — Validación corregida para DeepSeek
# ============================================================

import os
from pathlib import Path
from dotenv import load_dotenv

def _load_env():
    current = Path(__file__).resolve().parent
    for _ in range(4):
        env_file = current / ".env"
        if env_file.exists():
            load_dotenv(dotenv_path=env_file, override=True)
            print(f"[Config] Loaded .env from: {env_file}")
            return
        current = current.parent
    load_dotenv(override=True)
    print("[Config] Loaded .env from working directory (fallback)")

_load_env()


class Settings:
    # ── AI Providers ──────────────────────────────────────────
    GEMINI_API_KEY:      str = os.getenv("GEMINI_API_KEY", "")
    DEEPSEEK_API_KEY:    str = os.getenv("DEEPSEEK_API_KEY", "")
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "deepseek")
    DEFAULT_MODEL:       str = os.getenv("DEFAULT_MODEL", "deepseek-v4-flash")

    # ── Supabase ──────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # ── App ───────────────────────────────────────────────────
    APP_VERSION: str  = "1.3.0"
    APP_ENV:     str  = os.getenv("APP_ENV", "development")
    APP_PORT:    int  = int(os.getenv("APP_PORT", 8000))
    APP_HOST:    str  = os.getenv("APP_HOST", "0.0.0.0")
    DEBUG:       bool = os.getenv("DEBUG", "true").lower() == "true"

    # ── Seguridad / Acceso ────────────────────────────────────
    SECRET_KEY:        str = os.getenv("SECRET_KEY", "businessaios-change-in-production")
    ACCESS_KEY:        str = os.getenv("ACCESS_KEY", "")          # clave de ingreso única
    RECOVERY_EMAIL:    str = os.getenv("RECOVERY_EMAIL", "diegogilfer.93@gmail.com")
    JWT_EXPIRY_HOURS:  int = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # ── SMTP (recuperación de contraseña) ───────────────────────
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 465))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")

    # ── E-commerce ────────────────────────────────────────────
    AMAZON_CLIENT_ID:     str = os.getenv("AMAZON_CLIENT_ID", "")
    AMAZON_CLIENT_SECRET: str = os.getenv("AMAZON_CLIENT_SECRET", "")
    AMAZON_REFRESH_TOKEN: str = os.getenv("AMAZON_REFRESH_TOKEN", "")
    ALIEXPRESS_APP_KEY:   str = os.getenv("ALIEXPRESS_APP_KEY", "")
    ALIEXPRESS_APP_SECRET: str = os.getenv("ALIEXPRESS_APP_SECRET", "")

    # ── Stripe ────────────────────────────────────────────────
    STRIPE_SECRET_KEY:      str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET:  str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_STARTER:   str = os.getenv("STRIPE_PRICE_STARTER", "")
    STRIPE_PRICE_PRO:       str = os.getenv("STRIPE_PRICE_PRO", "")

    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")

    # ── Observabilidad ────────────────────────────────────────
    SENTRY_DSN:        str = os.getenv("SENTRY_DSN", "")
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    POSTHOG_API_KEY:   str = os.getenv("POSTHOG_API_KEY", "")
    POSTHOG_HOST:      str = os.getenv("POSTHOG_HOST", "https://app.posthog.com")

    # ── Canales — WhatsApp Business ──────────────────────────
    WHATSAPP_TOKEN:        str = os.getenv("WHATSAPP_TOKEN", "")
    WHATSAPP_PHONE_ID:     str = os.getenv("WHATSAPP_PHONE_ID", "")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "businessaios_verify")
    WHATSAPP_APP_SECRET:   str = os.getenv("WHATSAPP_APP_SECRET", "")

    # ── Canales — Telegram ────────────────────────────────────
    TELEGRAM_BOT_TOKEN:    str = os.getenv("TELEGRAM_BOT_TOKEN", "")

    def validate(self):
        """Validación al startup — ahora correcta para DeepSeek como provider principal."""
        warnings = []
        errors   = []

        # Verificar que haya AL MENOS un provider de IA
        if not self.DEEPSEEK_API_KEY and not self.GEMINI_API_KEY:
            errors.append("No hay ningún LLM provider configurado. Set DEEPSEEK_API_KEY en .env")
        elif self.DEFAULT_LLM_PROVIDER == "deepseek" and not self.DEEPSEEK_API_KEY:
            errors.append("DEFAULT_LLM_PROVIDER=deepseek pero DEEPSEEK_API_KEY no está configurado")
        elif self.DEFAULT_LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            errors.append("DEFAULT_LLM_PROVIDER=gemini pero GEMINI_API_KEY no está configurado")

        if not self.SUPABASE_URL:
            errors.append("SUPABASE_URL no configurado — sin persistencia de datos")
        if not self.SUPABASE_KEY:
            errors.append("SUPABASE_KEY no configurado — sin persistencia de datos")
        if not self.ACCESS_KEY:
            warnings.append("ACCESS_KEY no configurado — el sistema estará desprotegido")

        for w in warnings:
            print(f"[Config] ⚠️  WARNING: {w}")
        for e in errors:
            print(f"[Config] ❌ ERROR: {e}")
        return errors

    @property
    def active_provider(self) -> str:
        return self.DEFAULT_LLM_PROVIDER

    def __repr__(self):
        return (
            f"Settings(env={self.APP_ENV}, provider={self.DEFAULT_LLM_PROVIDER}, "
            f"deepseek={'SET' if self.DEEPSEEK_API_KEY else 'MISSING'}, "
            f"gemini={'SET' if self.GEMINI_API_KEY else 'MISSING'}, "
            f"supabase={'SET' if self.SUPABASE_URL else 'MISSING'}, "
            f"access_key={'SET' if self.ACCESS_KEY else 'MISSING'})"
        )


settings = Settings()

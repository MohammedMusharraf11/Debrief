from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")

    elevenlabs_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("ELEVENLABS_API_KEY", "XI_API_KEY"),
    )
    elevenlabs_stt_model: str = Field(default="scribe_v2", alias="ELEVENLABS_STT_MODEL")

    groq_api_key: str = Field(default="", validation_alias=AliasChoices("GROQ_API_KEY", "GROQ_KEY"))
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    groq_vision_model: str = Field(
        default="meta-llama/llama-4-scout-17b-16e-instruct",
        alias="GROQ_VISION_MODEL",
    )

    xai_api_key: str = Field(default="", alias="XAI_API_KEY")
    xai_base_url: str = Field(default="https://api.x.ai/v1", alias="XAI_BASE_URL")
    xai_model: str = Field(default="grok-4", alias="XAI_MODEL")

    openai_compatible_api_key: str = Field(default="", alias="OPENAI_COMPATIBLE_API_KEY")
    openai_compatible_base_url: str = Field(default="", alias="OPENAI_COMPATIBLE_BASE_URL")
    ai_model: str = Field(default="", alias="AI_MODEL")

    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")
    cors_origins_raw: str = Field(default="", alias="CORS_ORIGINS")
    storage_bucket: str = Field(default="visit-media", alias="SUPABASE_STORAGE_BUCKET")
    max_upload_bytes: int = Field(default=100 * 1024 * 1024, alias="MAX_UPLOAD_BYTES")

    @property
    def cors_origins(self) -> list[str]:
        configured = {
            origin.strip().rstrip("/")
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        }
        origins = {
            self.frontend_url.rstrip("/"),
            "https://debrief-frontend.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            *configured,
        }
        return [origin for origin in origins if origin]

    @property
    def cors_origin_regex(self) -> str:
        return r"^https://[a-z0-9-]+\.vercel\.app$"

    @property
    def llm_api_key(self) -> str:
        return self.groq_api_key or self.xai_api_key or self.openai_compatible_api_key

    @property
    def llm_base_url(self) -> str:
        if self.groq_api_key:
            return self.groq_base_url.rstrip("/")
        if self.xai_api_key:
            return self.xai_base_url.rstrip("/")
        return (self.openai_compatible_base_url or self.groq_base_url).rstrip("/")

    @property
    def llm_model(self) -> str:
        return self.ai_model or self.groq_model or self.xai_model

    @property
    def llm_vision_model(self) -> str:
        return self.groq_vision_model if self.groq_api_key else self.llm_model


@lru_cache
def get_settings() -> Settings:
    return Settings()

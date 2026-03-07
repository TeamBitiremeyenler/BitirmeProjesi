from pydantic_settings import BaseSettings, SettingsConfigDict

import os

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    JWT_SECRET: str
    
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore"
    )

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
from dotenv import load_dotenv
load_dotenv(dotenv_path=env_path)

try:
    settings = Settings()
except Exception as e:
    print(f"Warning: Failed to load settings from .env file: {e}")
    # Fallback to empty settings for initial scaffold, will crash properly when accessed
    settings = None

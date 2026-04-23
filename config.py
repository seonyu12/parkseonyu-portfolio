# 프로젝트 전역 설정을 관리하는 파일; 언어, 경로, Notion 키, 캐시 경로 등을 설정
import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEFAULT_LANG = os.getenv("DEFAULT_LANG", "ko")
    SUPPORTED_LANGS = ["ko", "en", "ja"]
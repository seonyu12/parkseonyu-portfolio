# 프로젝트 전역 설정을 관리하는 파일; 언어, 경로, Notion 키, 캐시 경로 등을 설정
import os
from dotenv import load_dotenv

# .env 파일에 저장된 값들을 읽어와서 os.getenv()로 접근 가능하게 만든다
# 이 줄이 없으면 .env에 값이 있어도 os.getenv()가 못 찾는다
load_dotenv()



# 앱 전역에서 쓰는 설정값들을 한곳에 모아두는 클래스
# app.py에서 app.config.from_object("config.Config")로 이 클래스를 통째로 불러다 쓴다
class Config:
    # Flask가 세션/쿠키 암호화 등에 쓰는 비밀 키. .env에 없으면 개발용 기본값을 사용
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    # 사용자가 언어를 지정하지 않았을 때 기본으로 보여줄 언어
    DEFAULT_LANG = os.getenv("DEFAULT_LANG", "ko")
    # 이 사이트가 지원하는 언어 목록. routes에서 "/<lang>/" 주소가 이 목록에 있는지 확인할 때 사용
    SUPPORTED_LANGS = ["ko", "en", "ja"]
    # Notion에서 가져온 데이터를 JSON으로 저장해두는 캐시 폴더 이름
    CACHE_DIR = "cache"
    # Notion API를 호출할 때 필요한 인증 토큰 (.env에만 저장하고 절대 코드에 직접 적지 않는다)
    NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
    # Reading(독서 기록) 데이터가 들어있는 Notion 데이터베이스의 ID
    NOTION_READING_DB = os.getenv("NOTION_READING_DB", "")


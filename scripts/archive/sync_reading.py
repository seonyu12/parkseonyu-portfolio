# scripts/archive/sync_reading.py
# Notion Reading DB에서 데이터를 가져와서 cache/archive/reading_ko.json으로 저장하는 스크립트

from config import Config
from services.notion_client import query_database
from services.notion_parser import parse_reading
from services.cache_service import save_cache


# Notion에서 최신 데이터를 가져와 로컬 캐시 파일로 저장하는 메인 함수
def sync_reading():
    # Notion API에 실제로 요청을 보내서 Reading DB의 모든 페이지(행)를 가져온다
    raw = query_database(Config.NOTION_READING_DB)

    # 가져온 페이지들 중 "Published" 체크박스가 켜진 것만 골라서
    # parse_reading()으로 우리가 쓰기 편한 dict 형태로 변환한다
    # (이런 식으로 한 줄에 반복문+조건문+변환을 함께 쓰는 것을 "리스트 컴프리헨션"이라고 한다)
    readings = [
        parse_reading(page)
        for page in raw
        if page["properties"]["Published"]["checkbox"]
    ]

    # 원래 청사진 기준 캐시 경로: cache/archive/reading_ko.json
    save_cache("archive/reading_ko.json", readings)
    print(f"Reading: {len(readings)}개 저장")


# 이 파일을 "python scripts/archive/sync_reading.py"처럼 터미널에서 직접 실행했을 때만
# sync_reading()이 자동으로 실행된다 (다른 파일에서 import할 때는 실행 안 됨)
if __name__ == "__main__":
    sync_reading()
# services/cache_service.py
# cache JSON 파일을 읽고 쓰는 공통 유틸 파일

import json
from pathlib import Path
from config import Config


def save_cache(relative_path, data):
    # cache/ 폴더 기준 상대 경로에 JSON 파일로 저장한다
    # 예: relative_path가 "reading/index_ko.json"이면
    # 실제로는 cache/reading/index_ko.json 에 저장됨
    path = Path(Config.CACHE_DIR) / relative_path

    # 저장할 폴더가 없으면 자동으로 만든다 (parents=True: 중간 폴더까지 다 생성)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        # ensure_ascii=False: 한글이 유니코드 escape 코드로 안 깨지고 그대로 저장되게 함
        # indent=2: 사람이 읽기 좋게 들여쓰기
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_cache(relative_path, default=None):
    # 저장된 JSON 파일을 읽어서 파이썬 데이터로 돌려준다
    path = Path(Config.CACHE_DIR) / relative_path

    if not path.exists():
        # 파일이 아직 없으면 기본값(보통 빈 리스트)을 돌려준다
        return default if default is not None else []

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
# services/archive/reading_service.py
# Reading 캐시 데이터를 불러오는 파일

from services.cache_service import load_cache


# lang="ko"처럼 매개변수에 기본값을 적어두면, 호출할 때 lang을 안 넘겨도 자동으로 "ko"가 쓰인다
def get_readings(lang="ko"):
    # cache/archive/reading_ko.json 파일을 읽어서 리스트로 돌려준다
    # 파일이 아직 없으면 에러 대신 빈 리스트를 안전하게 돌려준다
    return load_cache(f"archive/reading_{lang}.json", default=[])


def get_reading_by_slug(slug, lang="ko"):
    # 전체 책 리스트를 가져온 다음
    readings = get_readings(lang)

    # 그중에서 slug가 정확히 일치하는 책 하나만 찾아서 돌려준다
    # next(..., None) 은 "조건에 맞는 첫 번째 것을 찾고, 없으면 None을 돌려줘"라는 뜻
    return next((r for r in readings if r["slug"] == slug), None)
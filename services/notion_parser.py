# services/notion_parser.py
# Notion API 응답(복잡한 구조)을 우리가 쓰기 편한 간단한 dict 형태로 변환하는 파일


def _title(prop):
    # Notion의 "제목" 속성은 이렇게 복잡하게 생겼다:
    # {"type": "title", "title": [{"plain_text": "실제 제목"}]}
    # 그 안에서 진짜 텍스트만 뽑아낸다
    if prop["type"] == "title" and prop["title"]:
        return prop["title"][0]["plain_text"]
    return ""


def _text(prop):
    # "텍스트" 타입 속성(Slug, Author, Review 등)에서 실제 글자만 뽑아낸다
    if prop["type"] == "rich_text" and prop["rich_text"]:
        return prop["rich_text"][0]["plain_text"]
    return ""


def _files(prop):
    # "파일과 미디어" 타입 속성(Cover)에서 이미지 URL만 뽑아낸다
    files = prop.get("files", [])
    if not files:
        return None
    f = files[0]
    # Notion에 직접 업로드한 파일이면 "file", 외부 링크면 "external" 구조가 다르다
    if f["type"] == "file":
        return f["file"]["url"]
    return f["external"]["url"]


def _checkbox(prop):
    # 체크박스는 단순히 True/False 값
    return prop["checkbox"]


def _date(prop):
    # 날짜 속성. 값이 없을 수도 있으니 없으면 None
    if prop.get("date"):
        return prop["date"]["start"]
    return None


def parse_reading(page):
    # 페이지 하나(책 한 권)의 전체 속성들을 우리가 원하는 dict 구조로 정리
    p = page["properties"]

    return {
        "id": page["id"],
        "title": _title(p["Title"]),
        "slug": _text(p["Slug"]),
        "author": _text(p["Author"]),
        "cover": _files(p["Cover"]),
        "review": _text(p["Review"]),
        "published": _checkbox(p["Published"]),
        "date": _date(p["Date"]),
    }
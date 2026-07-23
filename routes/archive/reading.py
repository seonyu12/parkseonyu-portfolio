# routes/archive/reading.py
# Reading 목록/상세 페이지 라우트

from flask import Blueprint, render_template
from services.archive.reading_service import get_readings, get_reading_by_slug

# "reading"이라는 이름의 새 Blueprint(라우트 묶음)를 만든다
# archive_bp와는 별개의 상자이며, url_prefix로 "/archive/reading"을 지정한다
# 즉 이 안의 "/" 라우트는 실제로 "/archive/reading/" 이 된다
reading_bp = Blueprint("reading", __name__, url_prefix="/archive/reading")


@reading_bp.get("/")
def reading_list():
    # Reading 캐시에서 전체 책 목록을 가져온다 (지금은 lang을 "ko"로 고정)
    readings = get_readings("ko")
    return render_template("pages/archive/reading.html", readings=readings, lang="ko")


@reading_bp.get("/<slug>/")
def reading_detail(slug):
    # 주소에 들어온 slug로 책 하나를 찾는다
    reading = get_reading_by_slug(slug, "ko")

    # 찾는 책이 없으면 (예: 잘못된 주소로 접속) 404 페이지를 보여준다
    if reading is None:
        return render_template("pages/404.html"), 404

    # 찾았으면 상세 페이지를 보여준다
    return render_template("pages/archive/detail.html", item=reading, lang="ko")
# routes/archive/main.py
# Archive 메인 페이지 라우트 (Travel, Study, Reading, Blog 입구)

from flask import Blueprint, render_template

archive_bp = Blueprint("archive", __name__, url_prefix="/archive")


@archive_bp.get("/")
def archive_index():
    # 지금은 lang을 "ko"로 고정 (Stage 9에서 수정 예정)
    return render_template("pages/archive/index.html", lang="ko")
# routes/archive/main.py
# Archive 메인 페이지 라우트 (Travel, Study, Reading, Blog 입구)

from flask import Blueprint, render_template

# Blueprint는 라우트(주소 처리 함수)들을 하나로 묶어두는 "상자" 같은 것
# 이렇게 기능별로 상자를 나눠두면 app.py에서 필요한 상자만 골라 등록할 수 있어 코드가 정리된다
# url_prefix="/archive"를 주면 이 상자 안의 모든 주소 앞에 자동으로 "/archive"가 붙는다
archive_bp = Blueprint("archive", __name__, url_prefix="/archive")


# @archive_bp.get("/") 는 "GET 방식으로 /archive/ 주소에 요청이 오면 아래 함수를 실행해라"는 뜻의 데코레이터
@archive_bp.get("/")
def archive_index():
    # 지금은 lang을 "ko"로 고정 (Stage 9에서 수정 예정)
    return render_template("pages/archive/index.html", lang="ko")
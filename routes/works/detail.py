# routes/works/detail.py
# Works 상세 페이지 라우트

from flask import Blueprint, render_template

# 목록(main.py)과 상세(detail.py)를 별도 파일로 나눴지만
# 둘 다 같은 "works_bp" 상자에 등록해야 하므로
# main.py에서 만든 works_bp를 그대로 가져와서 쓴다
from routes.works.main import works_bp


# "<slug>"는 URL 안에서 값을 넘겨받는 자리표시자(변수)다
# 예: 주소가 /works/project-a/ 로 들어오면 slug 매개변수에 "project-a"가 담겨서 함수가 실행된다
@works_bp.get("/<slug>/")
def works_detail(slug):
    # 실제로는 slug로 Notion 데이터를 찾아야 하지만, 지금은 가짜 데이터
    work = {
        "slug": slug,
        "title": f"Project {slug}",
        "body": "이 프로젝트에 대한 상세 설명이 들어갈 자리입니다.",
    }

    # 지금은 lang을 "ko"로 고정 (Stage 9에서 수정 예정)
    return render_template("pages/works/detail.html", work=work, lang="ko")
# routes/works/main.py
# Works 목록 페이지 라우트

from flask import Blueprint, render_template

# url_prefix="/works" 를 주면, 이 상자 안의 모든 라우트 앞에 자동으로 "/works"가 붙는다
# 예: 아래 "/" 라우트는 실제로는 "/works/" 가 된다
works_bp = Blueprint("works", __name__, url_prefix="/works")


# GET 방식으로 /works/ 주소에 요청이 오면 아래 works_list 함수가 실행된다
@works_bp.get("/")
def works_list():
    # 아직 Notion 연동 전이라 가짜 데이터를 직접 만들어서 쓴다
    # Stage 4에서 이 부분을 진짜 Notion 데이터로 교체할 예정
    works = [
        {"slug": "project-a", "title": "Project A", "desc": "설명 A"},
        {"slug": "project-b", "title": "Project B", "desc": "설명 B"},
        {"slug": "project-c", "title": "Project C", "desc": "설명 C"},
    ]

    # 지금은 다국어 라우팅 전이라 lang을 "ko"로 고정해서 넘겨준다
    # Stage 9에서 Works에도 언어별 주소(/ko/works/ 등)가 생기면 이 부분을 수정할 예정
    return render_template("pages/works/index.html", works=works, lang="ko")
# routes/pages.py
# Home, About, Identity, Contact 같은 고정 소개 페이지 라우트

# render_template 은 templates/ 폴더 안의 HTML 파일을 찾아서 화면에 보여주는 함수
from flask import Blueprint, redirect, current_app, render_template

# "pages"라는 이름의 라우트 묶음(상자)을 하나 만든다
pages_bp = Blueprint("pages", __name__)


# "/" (그냥 루트 주소)로 GET 요청이 오면 실행되는 함수
@pages_bp.get("/")
def root():
    # 누군가 parkseonyu.com/ 으로 접속하면 자동으로 /ko/ 로 보내버린다
    return redirect("/ko/")


# 서버 생존 확인용 주소
@pages_bp.get("/healthz")
def healthz():
    return {"status": "ok"}


# 홈 페이지. <lang> 자리에 ko/en/ja가 들어온다
@pages_bp.get("/<lang>/")
def home(lang):
    # 지원하지 않는 언어면 기본 언어로 돌려보낸다
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/")

    # 지금은 ko만 테스트하는 단계라 home_ko.html을 고정으로 사용
    return render_template("pages/home_ko.html", lang=lang)


# About 페이지. 주소는 /ko/about, /en/about 등
@pages_bp.get("/<lang>/about")
def about(lang):
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/about")

    return render_template("pages/about_ko.html", lang=lang)


# Identity 페이지. 주소는 /ko/identity, /en/identity 등
@pages_bp.get("/<lang>/identity")
def identity(lang):
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/identity")

    return render_template("pages/identity_ko.html", lang=lang)


# Contact 페이지. 주소는 /ko/contact, /en/contact 등
@pages_bp.get("/<lang>/contact")
def contact(lang):
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/contact")

    return render_template("pages/contact_ko.html", lang=lang)
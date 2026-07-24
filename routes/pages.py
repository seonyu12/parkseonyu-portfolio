# routes/pages.py
# Home, About, Identity, Contact 같은 고정 소개 페이지 라우트

# render_template 은 templates/ 폴더 안의 HTML 파일을 찾아서 화면에 보여주는 함수
# redirect 는 사용자를 다른 주소로 자동으로 이동시키는 함수
# current_app 은 지금 실행 중인 Flask 앱 자기 자신을 가리키는 특수 변수
# (아래에서 current_app.config[...] 로 config.py에 설정해둔 값을 꺼내 쓴다)
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
    # home()과 동일한 패턴: 지원하지 않는 언어면 기본 언어의 about 페이지로 돌려보낸다
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/about")

    # identity()와 같은 방식: ko/en/ja 세 언어 템플릿(about_ko.html/
    # about_en.html/about_ja.html)이 모두 실제 내용으로 채워져
    # 있으므로, lang 값에 맞는 파일을 그대로 골라서 렌더링한다
    return render_template(f"pages/about_{lang}.html", lang=lang)


# Identity 페이지. 주소는 /ko/identity, /en/identity 등
@pages_bp.get("/<lang>/identity")
def identity(lang):
    # 마찬가지로 지원하지 않는 언어면 기본 언어의 identity 페이지로 돌려보낸다
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/identity")

    # home/about/contact와 달리 identity는 ko/en/ja 세 언어 템플릿이
    # 모두 실제 내용으로 채워져 있으므로, lang 값에 맞는 파일
    # (identity_ko.html / identity_en.html / identity_ja.html)을
    # 그대로 골라서 렌더링한다
    return render_template(f"pages/identity_{lang}.html", lang=lang)


# Contact 페이지. 주소는 /ko/contact, /en/contact 등
@pages_bp.get("/<lang>/contact")
def contact(lang):
    # 마찬가지로 지원하지 않는 언어면 기본 언어의 contact 페이지로 돌려보낸다
    if lang not in current_app.config["SUPPORTED_LANGS"]:
        return redirect(f"/{current_app.config['DEFAULT_LANG']}/contact")

    return render_template("pages/contact_ko.html", lang=lang)
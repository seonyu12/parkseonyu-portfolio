# Flask 앱을 생성하고 routes를 등록한 뒤 서버를 실행하는 메인 진입 파일
from flask import Flask, redirect
import os


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    @app.get("/")
    def root():
        return redirect("/ko/")

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.get("/<lang>/")
    def home(lang):
        if lang not in app.config["SUPPORTED_LANGS"]:
            return redirect(f"/{app.config['DEFAULT_LANG']}/")

        return f"""
        <!doctype html>
        <html lang="{lang}">
        <head>
            <meta charset="utf-8">
            <title>Park Seonyu Portfolio</title>
        </head>
        <body>
            <h1>parkseonyu.com</h1>
            <p>Portfolio site is coming soon.</p>
            <p>Language: {lang}</p>
        </body>
        </html>
        """

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
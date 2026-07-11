# app.py
# Flask 앱을 생성하고 routes를 등록한 뒤 서버를 실행하는 메인 진입 파일

from flask import Flask
import os

# 각 Blueprint(라우트 묶음 상자)를 가져온다
from routes.pages import pages_bp
from routes.works.main import works_bp

# detail.py는 works_bp라는 같은 상자에 라우트를 추가하는 파일이라
# 변수로 따로 쓸 필요는 없고, import만 해줘야 그 안의 라우트가 실제로 등록된다
from routes.works import detail

from routes.archive.main import archive_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    app.register_blueprint(pages_bp)
    app.register_blueprint(works_bp)
    app.register_blueprint(archive_bp)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
# app.py
# Flask 앱을 생성하고 routes를 등록한 뒤 서버를 실행하는 메인 진입 파일

from flask import Flask
import os  # 운영체제(OS) 기능을 쓰는 표준 라이브러리. 여기서는 환경변수(PORT)를 읽는 데 사용

# 각 Blueprint(라우트 묶음 상자)를 가져온다
from routes.pages import pages_bp
from routes.works.main import works_bp

# detail.py는 works_bp라는 같은 상자에 라우트를 추가하는 파일이라
# import만 해줘야 그 안의 라우트가 실제로 등록된다
from routes.works import detail

from routes.archive.main import archive_bp
from routes.archive.reading import reading_bp


# "애플리케이션 팩토리(application factory)" 패턴이라고 부르는 방식
# Flask 앱을 바로 만들지 않고, 이렇게 함수 안에서 만들어서 리턴하면
# 나중에 테스트용 앱을 따로 만들거나 설정을 다르게 넣기가 쉬워진다
def create_app():
    app = Flask(__name__)  # Flask 앱 객체 생성. __name__은 "이 파일이 어디 있는지" 알려주는 용도
    app.config.from_object("config.Config")  # config.py의 Config 클래스에 있는 설정값들을 앱에 불러온다

    # 위에서 import 한 Blueprint(라우트 묶음)들을 실제 앱에 연결(등록)한다
    # 등록해야만 그 안에 정의된 주소(라우트)들이 실제로 작동한다
    app.register_blueprint(pages_bp)
    app.register_blueprint(works_bp)
    app.register_blueprint(archive_bp)
    app.register_blueprint(reading_bp)

    return app


# 위에서 만든 팩토리 함수를 실제로 실행해서 app 객체를 만들어 둔다
# gunicorn 같은 배포 서버는 이 "app" 변수를 직접 찾아서 실행하기 때문에 필요하다
app = create_app()


# 이 파일을 "python app.py"처럼 직접 실행했을 때만 아래 코드가 동작한다
# (다른 파일에서 import만 했을 때는 실행되지 않음)
if __name__ == "__main__":
    # 배포 환경(예: Render, Railway)은 PORT라는 환경변수로 사용할 포트 번호를 알려준다
    # 환경변수가 없으면(로컬 개발 중) 기본값 5000번을 사용한다
    port = int(os.environ.get("PORT", 5000))
    # host="0.0.0.0"은 외부에서도 접속 가능하게 열어준다는 뜻
    # debug=True는 코드 수정 시 자동 재시작 + 에러 상세 화면을 보여줌 (개발용, 배포시엔 꺼야 함)
    app.run(host="0.0.0.0", port=port, debug=True)
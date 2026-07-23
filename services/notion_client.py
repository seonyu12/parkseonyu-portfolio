# services/notion_client.py
# Notion API와 연결하는 파일
# 참고: 2025년 9월 Notion API 개편으로 "database"와 "data source" 개념이 분리됨
# 예전엔 database에 직접 query 했지만, 이제는 그 database 안의 "data source"를 먼저 찾아서 query해야 함

from notion_client import Client
from config import Config

# Notion과 통신할 클라이언트 객체를 파일이 처음 로드될 때 한 번만 만들어 둔다
# auth에는 .env에서 읽어온 비밀 토큰(Config.NOTION_TOKEN)을 넣어 내 계정으로 인증한다
# 앞에 _(언더스코어)를 붙인 이름은 "이 파일 안에서만 쓰는 내부용 변수"라는 관례적 표시
_client = Client(auth=Config.NOTION_TOKEN)


# data_source_id에 해당하는 데이터베이스의 모든 행(페이지)을 가져오는 함수
def query_database(data_source_id):
    # find_databases()로 얻은 ID는 이미 data_source ID이므로
    # databases.retrieve()로 다시 변환할 필요 없이 바로 data_sources.query()에 사용한다
    results = []
    cursor = None

    # Notion API는 한 번 요청에 결과를 최대 일정 개수까지만 돌려준다(페이지네이션)
    # 그래서 "더 가져올 게 있는지(has_more)"를 계속 확인하며 반복해서 요청하고
    # 매번 받은 결과를 results 리스트에 이어 붙인다
    while True:
        resp = _client.data_sources.query(
            data_source_id=data_source_id,
            start_cursor=cursor
        )
        results.extend(resp["results"])

        if not resp.get("has_more"):
            break

        cursor = resp["next_cursor"]

    return results


# 내 Notion 계정에 연결된 데이터소스들의 제목과 ID를 찾아서 출력해주는 도구 함수
# .env에 넣을 NOTION_READING_DB 값을 처음 알아낼 때 한 번 실행해보는 용도
def find_databases():
    # API 개편으로 검색 필터 값이 "database" 대신 "data_source"로 바뀜
    resp = _client.search(filter={"property": "object", "value": "data_source"})
    for item in resp["results"]:
        title = ""
        if item.get("title"):
            # 제목이 비어있는 데이터소스도 있을 수 있어 없으면 "(제목 없음)"으로 표시
            title = item["title"][0]["plain_text"] if item["title"] else "(제목 없음)"
        print(f"제목: {title} / ID: {item['id']}")
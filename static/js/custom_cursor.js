// ============================================
// custom_cursor.js
// 브라우저 기본 화살표 커서를 숨기고,
// 대신 태양 이미지가 마우스를 따라다니게 만드는 스크립트
// + 마우스가 지나간 자리에 빛나는 잔상(trail)을 남기는 효과
// + 마우스가 멈추면, 생성된 순서대로 잔상들이 빠르게 사라지는 효과
// + "no-trail" 클래스가 붙은 개별 요소(언어전환, 푸터 등) 위에서는 잔상이 안 생김
// + 헤더(.site-header) 영역 전체 안에서도 통째로 잔상이 안 생김
// ============================================

// "DOMContentLoaded"는 HTML 문서가 다 읽혀서 화면에 태그들이 준비된 시점에 발생하는 이벤트다.
// 이미지 등 모든 리소스가 다 로드될 때까지 기다리는 게 아니라,
// HTML 구조(태그)만 완성되면 바로 실행되므로 커서 스크립트처럼 빨리 시작해야 하는 코드에 적합하다.
document.addEventListener("DOMContentLoaded", function () {

  // 화면에 실제로 보여줄 커스텀 커서(태양 이미지) 역할을 할 div를 새로 만들어서
  // body 태그 맨 끝에 붙인다. 실제 모양(원형, 태양 이미지 등)은 CSS의 .custom-cursor 클래스가 담당한다.
  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  document.body.appendChild(cursor);


  // 마지막으로 잔상(trail)을 만든 시각(타임스탬프)을 기억하는 변수
  let lastTrailTime = 0;
  // 잔상을 몇 밀리초(ms)마다 하나씩 만들지 정하는 간격. 값이 작을수록 잔상이 촘촘해진다.
  const trailInterval = 40;

  // 지금 마우스가 링크/버튼 위에 있어서 커서가 빛나는(glowing) 상태인지 기억하는 변수
  let isGlowing = false;

  // "지금 마우스가 잔상을 꺼야 하는 영역 위에 있는지" 기억하는 변수
  // no-trail 클래스가 붙은 개별 요소 위에 있거나, 헤더 영역 안에 있으면 true가 된다
  let isOverNoTrailZone = false;

  // 마우스가 멈춘 뒤 "잔상을 다 지울지" 예약해 둔 setTimeout의 ID를 저장하는 변수
  // (마우스가 다시 움직이면 이 예약을 취소해야 하므로 clearTimeout에 쓸 ID를 기억해 둔다)
  let stopTimer = null;

  // 잔상 하나가 자연스럽게 서서히 사라지기까지 걸리는 전체 시간(ms). CSS 애니메이션 기본 지속시간과 맞춤
  const TOTAL_DURATION = 3000;
  // 마우스가 멈췄을 때, 잔상을 "빠르게" 사라지게 할 때 걸리는 시간(ms)
  const QUICK_FADE_DURATION = 150;
  // 잔상이 여러 개 있을 때, 한 번에 다 지우지 않고 생성된 순서대로 약간씩 시차를 두고 지우기 위한 간격(ms)
  const STAGGER_GAP = 30;


  // 잔상(trail) 요소 하나를 "지금 이 순간부터 빠르게" 사라지게 만드는 함수
  // 원래 CSS 애니메이션이 진행 중이던 걸 멈추고, 현재 보이던 투명도(opacity)에서
  // 시작해 QUICK_FADE_DURATION 시간 동안 0으로 부드럽게 줄어들도록 강제로 바꿔치기한다
  function fadeOutNow(el) {
    const currentOpacity = window.getComputedStyle(el).opacity;
    el.style.animation = "none";
    el.style.opacity = currentOpacity;
    // el.offsetHeight를 그냥 읽기만 해도 브라우저가 스타일 변경을 강제로 즉시 반영(reflow)하게 된다.
    // 이 한 줄이 없으면 위에서 바꾼 opacity와 아래서 바꾸는 opacity가 브라우저 눈에는 "동시에" 일어난 것처럼
    // 보여서 transition(서서히 변하는 효과)이 아예 생략되고 순간적으로 사라져 버릴 수 있다.
    void el.offsetHeight;
    el.style.transition = `opacity ${QUICK_FADE_DURATION}ms ease-out`;
    el.style.opacity = "0";
    setTimeout(function () {
      el.remove();
    }, QUICK_FADE_DURATION);
  }

  // 현재 화면에 남아있는 잔상(.cursor-trail)들을 전부 찾아서,
  // 생성된 순서(index)대로 조금씩 시차(STAGGER_GAP)를 두고 차례차례 fadeOutNow로 지운다
  // → 한꺼번에 뚝 사라지지 않고, 만들어진 순서대로 훑듯이 사라지는 느낌을 준다
  function clearAllTrails() {
    const trails = document.querySelectorAll(".cursor-trail");
    trails.forEach(function (trail, index) {
      setTimeout(function () {
        fadeOutNow(trail);
      }, index * STAGGER_GAP);
    });
  }


  // 마우스가 움직일 때마다(mousemove) 실행되는 핵심 이벤트 리스너
  // 1) 커서(태양 이미지)를 실제 마우스 위치로 이동시키고
  // 2) 잔상을 끄는 영역이 아니고, 마지막 잔상 생성 후 trailInterval(ms)이 지났다면 새 잔상을 하나 만들고
  // 3) 마우스가 계속 움직이는 동안은 "멈췄다"고 보지 않도록, 움직일 때마다 잔상 지우기 예약을 취소하고 다시 예약한다
  document.addEventListener("mousemove", function (e) {

      // translate3d를 쓰면 브라우저가 GPU 가속을 사용해 더 부드럽게 이동시킬 수 있다
      cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      const now = Date.now();

      if (!isOverNoTrailZone && now - lastTrailTime > trailInterval) {
        createTrailDot(e.clientX, e.clientY);
        lastTrailTime = now;
      }

      // 이미 예약해 둔 "잔상 지우기" 타이머가 있다면 취소한다
      // (마우스가 계속 움직이고 있다는 뜻이므로, 아직 잔상을 지울 때가 아니다)
      if (stopTimer !== null) {
        clearTimeout(stopTimer);
      }

      // 100ms 동안 추가로 mousemove 이벤트가 없으면(=마우스가 멈췄다고 판단되면)
      // 그때 clearAllTrails()를 실행해서 남은 잔상들을 지운다
      stopTimer = setTimeout(function () {
        clearAllTrails();
      }, 100);
    });


  // 마우스 위치(x, y)에 잔상 점 하나를 새로 만들어서 화면에 추가하고,
  // TOTAL_DURATION(ms) 뒤에는 (CSS 애니메이션이 끝났을 시점) 자동으로 DOM에서 제거하는 함수
  function createTrailDot(x, y) {
    const dot = document.createElement("div");
    dot.className = "cursor-trail";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    document.body.appendChild(dot);
    setTimeout(function () {
      dot.remove();
    }, TOTAL_DURATION);
  }


  // 페이지 안의 모든 링크(a)와 버튼(button) 요소를 찾아서,
  // 마우스가 그 위에 올라가면 커서에 "glowing" 클래스를 붙여 빛나는 스타일로 바꾸고
  // 마우스가 벗어나면 다시 원래 상태로 되돌린다 (클릭 가능한 요소임을 시각적으로 알려주는 효과)
  const clickable = document.querySelectorAll("a, button");

  clickable.forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      cursor.classList.add("glowing");
      isGlowing = true;
    });

    el.addEventListener("mouseleave", function () {
      cursor.classList.remove("glowing");
      isGlowing = false;
    });
  });


  // ============================================
  // ---- 1. 개별 "no-trail" 클래스가 붙은 요소들: 잔상 끄기 ----
  // 언어전환 버튼, 푸터 이메일 링크 등 헤더 밖에 있는 요소들에 적용
  // ============================================
  const noTrailZones = document.querySelectorAll(".no-trail");

  noTrailZones.forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      isOverNoTrailZone = true;
    });

    el.addEventListener("mouseleave", function () {
      isOverNoTrailZone = false;
    });
  });


  // ============================================
  // ---- 2. 헤더(.site-header) 영역 전체: 통째로 잔상 끄기 ----
  // 로고, 메뉴 등 개별 요소마다 클래스를 안 붙여도
  // 헤더 안 어디든 마우스가 있으면 자동으로 잔상이 꺼진다
  // ============================================
  const siteHeader = document.querySelector(".site-header");

  if (siteHeader) {
    siteHeader.addEventListener("mouseenter", function () {
      isOverNoTrailZone = true;
    });

    siteHeader.addEventListener("mouseleave", function () {
      isOverNoTrailZone = false;
    });
  }

}); // DOMContentLoaded 닫는 괄호
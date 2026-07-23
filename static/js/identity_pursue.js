// ============================================
// identity_pursue.js
// "What I pursue" 섹션(조명+책+말풍선+전체보기)의 클릭 동작만 담당하는
// 작고 독립적인 스크립트. identity_cloud_scene.js(3D 인트로)와는
// 완전히 별개로 동작하므로, 이 섹션이 없는 페이지에서 실행돼도
// 아무 일도 일어나지 않도록 요소가 없으면 조용히 종료한다.
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const scene = document.querySelector("#pursue-scene");
  const bookTrigger = document.querySelector("#pursue-book-trigger");
  const lamp = document.querySelector(".pursue-lamp");
  const collapseButton = document.querySelector("#pursue-collapse");
  const bubblesWrap = document.querySelector("#pursue-bubbles");
  const bubbles = document.querySelectorAll(".pursue-bubble");
  const detailPanel = document.querySelector("#pursue-detail");
  const detailTitle = document.querySelector("#pursue-detail-title");
  const detailText = document.querySelector("#pursue-detail-text");
  const viewAllButton = document.querySelector("#pursue-viewall");
  const expandedPanel = document.querySelector("#pursue-expanded");
  const closeButton = document.querySelector("#pursue-close");

  // 이 페이지에 "What I pursue" 섹션 자체가 없으면(다른 언어 페이지 등)
  // 더 진행할 이유가 없으므로 여기서 끝낸다
  if (!scene || !bookTrigger) {
    return;
  }

  // ============================================
  // 책을 클릭(또는 Enter/Space로 포커스 후 실행)하면 말풍선 4개를
  // "고정으로" 펼치거나 다시 접는다. 마우스만 올렸다 뗄 땐 CSS
  // hover만으로 이미 열렸다 닫히므로(별도 JS 불필요), 이 클릭은
  // 터치 기기처럼 hover가 없는 환경에서도 열 수 있게 하기 위한
  // 보조 수단이다. 버튼의 aria-expanded도 같이 갱신해서
  // 스크린리더 사용자에게도 지금 열려있는지/닫혀있는지 알려준다
  // ============================================
  bookTrigger.addEventListener("click", function () {
    const isOpen = scene.classList.toggle("is-open");
    bookTrigger.setAttribute("aria-expanded", String(isOpen));
  });

  // 접기 버튼: 클릭으로 고정해둔 상태(.is-open)를 풀고 말풍선을 닫는다
  if (collapseButton) {
    collapseButton.addEventListener("click", function () {
      scene.classList.remove("is-open");
      bookTrigger.setAttribute("aria-expanded", "false");
    });
  }

  // ============================================
  // 키워드 말풍선에 마우스를 올리거나(hover) 키보드로 포커스하면
  // 해당 말풍선의 제목/설명을 읽어서 화면 중앙의 #pursue-detail
  // 패널에 그대로 옮겨 넣고 보여준다. 패널은 항상 같은 자리에서만
  // 나타났다 사라지므로(말풍선 자체는 안 움직임) 예전처럼
  // 커서 아래에서 요소가 빠져나가 hover가 깜빡이는 문제가 없다.
  //
  // 마우스가 책/조명/말풍선/설명 패널을 떠나면 바로 닫지 않고
  // 짧게(400ms) 기다린 뒤 닫는다 — 책이나 조명에서 커서를 떼서
  // 저 멀리 떨어진 말풍선까지 이동하는 동안에도 그 사이에 다른
  // 말풍선이나 설명 패널로 마우스가 옮겨가면 닫기를 취소해서,
  // 매번 깜빡이지 않고 부드럽게 전환된다.
  // ============================================
  let hasViewedKeyword = false;
  let closeTimer = null;
  let activeBubble = null;

  // ============================================
  // 말풍선 4개는 "책이나 조명에 실제로 커서를 올렸을 때"만 열린다.
  // 예전에는 CSS만으로(.pursue-scene:hover) 무대 전체 어디에
  // 커서가 있어도 열려버렸는데(말풍선이 놓일 빈 구석까지도),
  // 이제는 책/조명 위에 있을 때만 scene에 is-hover-open 클래스를
  // 붙이는 방식으로 바꿨다. 책/조명에서 커서를 떼도 바로 닫지
  // 않고 짧게 유예를 두는 이유는, 그 사이에 커서가 실제 말풍선
  // 쪽으로 이동할 시간을 주기 위해서다(아래 openReveal 참고) —
  // 이 유예/닫기 타이머는 위에서 쓰는 closeTimer를 그대로
  // 공유해서, 말풍선 설명 패널과 말풍선 노출 상태가 항상
  // 같이 열리고 같이 닫히게 한다
  // ============================================
  function openReveal() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    scene.classList.add("is-hover-open");
  }

  [bookTrigger, lamp].forEach(function (trigger) {
    if (!trigger) {
      return;
    }

    trigger.addEventListener("mouseenter", openReveal);
    trigger.addEventListener("focus", openReveal);
    trigger.addEventListener("mouseleave", scheduleHideDetail);
    trigger.addEventListener("blur", scheduleHideDetail);
  });

  // 이 글자 수를 넘으면 "긴 설명"으로 보고 패널 안 폰트를 한 단계
  // 줄인다(패널 크기는 그대로 두고 여백만 확보). 네 키워드 중
  // 지금은 "친절함"(약 350자 이상)만 여기 걸리고, 나머지
  // (창의성/도전/무한, 약 130~150자)는 원래 크기 그대로 유지된다
  const LONG_TEXT_THRESHOLD = 200;

  function showDetailFor(bubble) {
    if (!detailPanel || !detailTitle || !detailText) {
      return;
    }

    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    const titleEl = bubble.querySelector(".pursue-bubble-title");
    const textEl = bubble.querySelector(".pursue-bubble-detail");

    detailTitle.innerHTML = titleEl ? titleEl.innerHTML : "";
    detailText.innerHTML = textEl ? textEl.innerHTML : "";

    const isLong =
      !!textEl && textEl.textContent.trim().length > LONG_TEXT_THRESHOLD;
    detailPanel.classList.toggle("is-long", isLong);

    if (activeBubble && activeBubble !== bubble) {
      activeBubble.classList.remove("is-active");
    }

    activeBubble = bubble;
    bubble.classList.add("is-active");

    if (bubblesWrap) {
      bubblesWrap.classList.add("is-focused");
    }

    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");

    // "전체보기"는 키워드를 하나라도 확인한 뒤부터 보여준다
    if (!hasViewedKeyword && viewAllButton) {
      hasViewedKeyword = true;
      viewAllButton.classList.add("is-visible");
    }
  }

  function scheduleHideDetail() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
    }

    closeTimer = window.setTimeout(function () {
      closeTimer = null;

      // 말풍선 노출(is-hover-open)과 설명 패널을 함께 닫는다 —
      // 단, 클릭으로 고정해둔 상태(.is-open)라면 마우스가 벗어나도
      // 책/말풍선은 계속 펼쳐져 있어야 하므로 is-hover-open만
      // 걷어내고 is-open은 건드리지 않는다
      scene.classList.remove("is-hover-open");

      if (activeBubble) {
        activeBubble.classList.remove("is-active");
        activeBubble = null;
      }

      if (bubblesWrap) {
        bubblesWrap.classList.remove("is-focused");
      }

      if (detailPanel) {
        detailPanel.classList.remove("is-visible");
        detailPanel.setAttribute("aria-hidden", "true");
      }
    }, 400);
  }

  bubbles.forEach(function (bubble) {
    bubble.addEventListener("mouseenter", function () {
      showDetailFor(bubble);
    });

    bubble.addEventListener("mouseleave", scheduleHideDetail);

    bubble.addEventListener("focus", function () {
      showDetailFor(bubble);
    });

    bubble.addEventListener("blur", scheduleHideDetail);
  });

  // 설명 패널 자체에 마우스가 올라가 있는 동안에도(예: 텍스트를
  // 읽으려고 패널 위로 마우스를 옮긴 경우) 닫히지 않게 한다
  if (detailPanel) {
    detailPanel.addEventListener("mouseenter", function () {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    });

    detailPanel.addEventListener("mouseleave", scheduleHideDetail);
  }

  // ============================================
  // "전체보기" 버튼: 책+말풍선 장면 대신 4개 카드를 한 번에 보여주는
  // 영역을 페이지 안에서 펼친다(오버레이 팝업이 아니라 일반 콘텐츠처럼)
  // ============================================
  if (viewAllButton && expandedPanel) {
    viewAllButton.addEventListener("click", function () {
      openExpanded();
    });
  }

  if (closeButton && expandedPanel) {
    closeButton.addEventListener("click", function () {
      closeExpanded();
    });
  }

  // 오버레이가 열려 있는 동안 Esc 키를 누르면 바로 닫히게 한다
  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      expandedPanel &&
      expandedPanel.classList.contains("is-visible")
    ) {
      closeExpanded();
    }
  });

  // 전체보기로 펼쳐질 때 화면을 꽉 채워야 하는 섹션 자체(#identity-pursue).
  // 이전엔 이 섹션 안에서 .pursue-expanded가 max-height:0→3000px로
  // "천천히 자라나는" 방식이었는데, 그 성장 애니메이션이 진행되는
  // 동안 섹션 전체 높이가 계속 바뀌면서(=바로 아래 포커스 섹션의
  // 시작 위치도 같이 밀려나면서) scroll-snap-type: mandatory가 그
  // 흔들리는 레이아웃을 다시 스냅시키려다 포커스 섹션까지 훅
  // 넘어갔다 돌아오는 문제가 있었다. 이제는 오래 걸리는 높이
  // 애니메이션 없이 즉시 전환하고, 레이아웃이 완전히 자리잡은
  // 뒤에야 스크롤을 시작해서 이 문제 자체를 원천적으로 막는다
  const pursueSection = document.querySelector("#identity-pursue");

  function openExpanded() {
    expandedPanel.setAttribute("aria-hidden", "false");

    // 펼쳐진 동안엔 "전체보기" 버튼을 숨긴다 — 이미 펼쳐져 있는데
    // 또 누를 수 있는 버튼이 같이 보이면 헷갈리니, 돌아가는 길은
    // "닫기" 버튼 하나만 남긴다
    if (viewAllButton) {
      viewAllButton.classList.remove("is-visible");
    }

    if (pursueSection) {
      pursueSection.classList.add("is-expanded");
    }

    expandedPanel.classList.add("is-visible");

    // 클래스를 붙인 직후 바로 스크롤하면, 아직 브라우저가 새
    // 레이아웃(전체보기가 화면을 꽉 채운 높이)을 계산/반영하기 전
    // 시점을 스크롤 목표로 잡을 수 있다. 두 번의 requestAnimationFrame으로
    // 최소 한 번의 렌더링(스타일 계산 + 레이아웃 + 페인트)이 실제로
    // 끝난 뒤에 스크롤을 시작하도록 한 프레임을 확실히 넘긴다
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        scrollIntoViewPausingSnap(expandedPanel);
      });
    });
  }

  // identity.css의 scroll-snap-type: mandatory와 scrollIntoView가
  // 부딪히는 문제를 막는 공용 함수. 예전엔 body/html에 클래스를
  // 붙였다 떼는 방식으로 스냅을 껐는데, 클래스 기반은 스타일시트
  // 쪽 선택자 우선순위/작성 순서에 기대야 해서 불안정할 수 있다.
  // 대신 documentElement/body의 인라인 style로 scroll-snap-type을
  // 직접 지정한다 — 인라인 스타일은 스타일시트의 어떤 규칙보다도
  // 항상 우선하므로, 우선순위 걱정 없이 확실하게 꺼진다. 스크롤이
  // "진짜로 끝난" 시점(scrollend)에 원래 값(스타일시트가 정하던 값)으로
  // 되돌리고, scrollend를 지원하지 않는 아주 오래된 브라우저를
  // 대비해 넉넉한 시간(1800ms)의 안전장치도 같이 둔다
  function scrollIntoViewPausingSnap(target) {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    const prevHtmlSnap = htmlEl.style.scrollSnapType;
    const prevBodySnap = bodyEl.style.scrollSnapType;

    htmlEl.style.scrollSnapType = "none";
    bodyEl.style.scrollSnapType = "none";

    let resumed = false;

    function resume() {
      if (resumed) {
        return;
      }

      resumed = true;
      htmlEl.style.scrollSnapType = prevHtmlSnap;
      bodyEl.style.scrollSnapType = prevBodySnap;
    }

    window.addEventListener("scrollend", resume, { once: true });
    window.setTimeout(resume, 1800);

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function closeExpanded() {
    expandedPanel.classList.remove("is-visible");
    expandedPanel.setAttribute("aria-hidden", "true");

    if (pursueSection) {
      pursueSection.classList.remove("is-expanded");
    }

    // 닫으면 "전체보기" 버튼을 다시 보여준다(키워드를 한 번이라도
    // 봤으니 hasViewedKeyword는 이미 true인 상태다)
    if (viewAllButton && hasViewedKeyword) {
      viewAllButton.classList.add("is-visible");
    }
  }
});

// ============================================
// 무지개/해/타이틀(.identity-final-weather)과 스토리 본문(#identity-body)을
// 스크롤에 맞춰 함께 나타났다 사라지게 하는 부분.
// 두 요소 모두 이 섹션(identity_pursue.js)이 아니라 identity_ko.html
// 위쪽(identity-scene)에 속해 있지만, "다음 섹션(#identity-pursue)이
// 얼마나 화면에 들어왔는지"를 기준으로 페이드시켜야 하므로
// 여기서 함께 처리한다. #identity-pursue가 없는 페이지(아직 en/ja에는
// 없음)에서는 조용히 아무 일도 하지 않는다.
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const weather = document.querySelector(".identity-final-weather");
  const storyBody = document.querySelector("#identity-body");
  const pursueSection = document.querySelector("#identity-pursue");

  if (!weather || !pursueSection) {
    return;
  }

  let ticking = false;

  function updateFade() {
    ticking = false;

    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const pursueTop =
      pursueSection.getBoundingClientRect().top;

    // pursueTop이 화면 높이(viewportHeight)만큼 아래에 있으면(=아직
    // 한참 멀었으면) progress는 0(완전히 보임). pursueTop이 0 이하로
    // 올라오면(=다음 섹션이 화면 맨 위까지 다 올라왔으면) progress는
    // 1(완전히 사라짐). 그 사이는 비례해서 부드럽게 이어진다
    const raw =
      1 -
      Math.min(
        Math.max(pursueTop / viewportHeight, 0),
        1,
      );

    const opacity = 1 - raw;

    weather.style.opacity = String(opacity);

    if (storyBody) {
      storyBody.style.opacity = String(opacity);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateFade);
    }
  }

  window.addEventListener("scroll", onScroll, {
    passive: true,
  });

  window.addEventListener("resize", onScroll);

  // 페이지가 처음 열렸을 때(혹은 새로고침으로 스크롤 위치가
  // 유지된 채 로드됐을 때)도 한 번 계산해서 값을 맞춰둔다
  updateFade();
});

// ============================================
// identity_focus.js
// "What I focus on" 섹션(어두운 무대 + 손전등 숨바꼭질 + 상어
// 이스터에그 + skip 전체보기)의 인터랙션만 담당하는 작고 독립적인
// 스크립트. identity_cloud_scene.js(3D 인트로), identity_pursue.js
// (What I pursue 섹션)와는 완전히 별개로 동작하므로, 이 섹션이 없는
// 페이지(en/ja)에서 실행돼도 아무 일도 일어나지 않도록 요소가
// 없으면 조용히 종료한다.
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const section = document.querySelector("#identity-focus");
  const stage = document.querySelector("#focus-stage");
  const fog = document.querySelector("#focus-fog");
  const hint = document.querySelector("#focus-hint");
  const detailPanel = document.querySelector("#focus-detail");
  const detailTitle = document.querySelector("#focus-detail-title");
  const detailText = document.querySelector("#focus-detail-text");
  const detailClose = document.querySelector("#focus-detail-close");
  const shark = document.querySelector("#focus-shark");
  const skipButton = document.querySelector("#focus-skip");
  const closeButton = document.querySelector("#focus-close");
  const expandedPanel = document.querySelector("#focus-expanded");
  const characters = document.querySelectorAll(
    ".focus-character:not(.focus-character--shark)",
  );

  // 이 페이지에 "What I focus on" 섹션 자체가 없으면(다른 언어
  // 페이지 등) 더 진행할 이유가 없으므로 여기서 끝낸다
  if (!section || !stage || !fog) {
    return;
  }

  // ============================================
  // 네비게이터(헤더) 색을 Focus 섹션 상태에 맞춰 바꾼다. 어두운
  // 숨바꼭질 무대가 화면 중앙을 차지할 때만 헤더도 어둡게 하고,
  // 전체보기(is-expanded, 밝은 배경)로 바뀌면 헤더도 다시
  // 밝은색으로 돌아와야 한다 — 이 둘을 함께 고려해야 해서,
  // "지금 Focus 섹션이 화면 중앙에 보이는가"(IntersectionObserver)와
  // "지금 전체보기 상태인가"(is-expanded)를 한 함수에서 같이
  // 판단한다. is-expanded는 스크롤 없이 클릭/자동으로도 바뀔 수
  // 있어서, 그때도 즉시 다시 계산하도록 openExpandedView/닫기
  // 쪽에서도 이 함수를 직접 불러준다
  // ============================================
  let isFocusInCenter = false;

  // 인트로(#identity-scene)가 지금 "먹구름/비" 단계인지도 헤더 색
  // 판단에 같이 넣는다. is-storm이 붙어있고 아직 is-clearing(다시
  // 맑아지는 중) 전이라면 화면이 어두운 상태이므로 헤더도 어둡게,
  // is-clearing이 붙는 순간부터는(하늘이 다시 밝아지기 시작하는
  // 시점) 헤더도 같이 밝아지도록 한다
  let isSceneStormy = false;

  // 네비게이터 배경을 지금 화면에 보이는 구간의 "실제" 배경색에
  // 맞추기 위해, 단순히 밝다/어둡다 둘 중 하나가 아니라 4가지
  // 테마 중 하나를 body의 data-header-theme 속성에 써넣는다
  // (실제 색상은 identity.css의 [data-header-theme="..."] 규칙이
  // 각 구간의 진짜 배경색과 맞춰 정의한다):
  //   storm       — 인트로 먹구름/비 구간 (회색 하늘)
  //   focus-dark  — Focus 숨바꼭질 무대 (새까만 배경)
  //   focus-light — Focus 전체보기 (크림색 카드 화면)
  //   (기본, 속성 없음) — 맑은 하늘/Pursue 구간
  function updateHeaderDarkState() {
    let theme = null;

    if (isSceneStormy) {
      theme = "storm";
    } else if (isFocusInCenter) {
      theme = section.classList.contains("is-expanded")
        ? "focus-light"
        : "focus-dark";
    }

    if (theme) {
      document.body.setAttribute("data-header-theme", theme);
    } else {
      document.body.removeAttribute("data-header-theme");
    }
  }

  if ("IntersectionObserver" in window) {
    const headerObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          isFocusInCenter = entry.isIntersecting;
          updateHeaderDarkState();
        });
      },
      {
        // 뷰포트 세로 중앙 지점만 걸치는 얇은 띠를 기준으로 판단해서,
        // "지금 화면 한가운데 보이는 게 Focus 섹션이냐"를 확인한다
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0,
      },
    );

    headerObserver.observe(section);
  }

  // ============================================
  // 인트로 씬(#identity-scene)의 먹구름/맑음 상태를 감시해서 헤더
  // 색에 반영한다. identity_cloud_scene.js가 진행 단계에 따라
  // is-storm / is-clearing / is-final 클래스를 붙였다 뗐다 하므로,
  // 여기서는 그 클래스 변화만 MutationObserver로 지켜보면 된다
  // (cloud_scene.js 자체를 건드릴 필요가 없다)
  // ============================================
  const scene = document.querySelector("#identity-scene");

  if (scene && "MutationObserver" in window) {
    const syncSceneStorm = function () {
      isSceneStormy =
        scene.classList.contains("is-storm") &&
        !scene.classList.contains("is-clearing") &&
        !scene.classList.contains("is-final");

      updateHeaderDarkState();
    };

    syncSceneStorm();

    const sceneObserver = new MutationObserver(syncSceneStorm);

    sceneObserver.observe(scene, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  // ============================================
  // 캐릭터 3개 + 상어까지 총 4개의 위치를 새로고침할 때마다
  // 무작위로 다시 뽑는다(HTML의 left/top은 JS가 못 돌아갈 때를
  // 대비한 기본값일 뿐, 정상적으로는 항상 이 함수가 덮어쓴다).
  // 완전히 무작위로 뽑으면 서로 겹치거나 화면 가장자리에 너무
  // 붙을 수 있어서, 최소 거리 이상 떨어질 때까지 다시 뽑는
  // 방식(rejection sampling)으로 자연스럽게 흩어지게 한다
  // ============================================
  function randomizePositions() {
    const allSpots = document.querySelectorAll(".focus-character");

    if (!allSpots.length) {
      return;
    }

    const MARGIN = 10; // 가장자리에서 최소 10% 떨어뜨린다
    const MIN_DISTANCE = 26; // 요소끼리 최소 이만큼(%) 떨어뜨린다
    const MAX_ATTEMPTS = 40;

    // 캐릭터를 찾으면 화면 정중앙에 #focus-detail 팝업이 뜨는데,
    // 캐릭터가 하필 그 자리 근처에 있으면 팝업이 뜨자마자 캐릭터를
    // 덮어버려서 커서가 팝업 위에 있는 건지 캐릭터 위에 있는 건지
    // 뒤섞여 hover가 깜빡이는("커서 인식 충돌") 문제가 있었다.
    // 그래서 화면 중앙 반경 안쪽은 아예 후보에서 제외한다
    const CENTER_X = 50;
    const CENTER_Y = 50;
    const CENTER_EXCLUDE_RADIUS = 24;

    // 무대 맨 위에는 "What I focus on" 타이틀(.focus-eyebrow)이 항상
    // 떠 있는데, 캐릭터가 하필 그 자리 근처에 뽑히면 타이틀 글자와
    // 겹쳐 보이는 문제가 있었다. 상단 일정 비율(%) 안쪽은 아예
    // 후보에서 제외해서 타이틀 자리를 항상 비워둔다
    const TOP_EXCLUDE_Y = 22;

    const placed = [];

    allSpots.forEach(function (el) {
      let best = null;
      let bestScore = -1;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const x = MARGIN + Math.random() * (100 - MARGIN * 2);
        const y = MARGIN + Math.random() * (100 - MARGIN * 2);

        if (y < TOP_EXCLUDE_Y) {
          // 타이틀 영역과 겹치는 후보는 바로 다시 뽑는다
          continue;
        }

        const centerDx = x - CENTER_X;
        const centerDy = y - CENTER_Y;
        const centerDist = Math.sqrt(
          centerDx * centerDx + centerDy * centerDy,
        );

        if (centerDist < CENTER_EXCLUDE_RADIUS) {
          // 중앙 팝업 영역과 겹치는 후보는 바로 다시 뽑는다
          continue;
        }

        let nearest = Infinity;

        placed.forEach(function (spot) {
          const dx = spot.x - x;
          const dy = spot.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < nearest) {
            nearest = dist;
          }
        });

        if (placed.length === 0 || nearest >= MIN_DISTANCE) {
          best = { x: x, y: y };
          break;
        }

        // 조건을 만족하는 자리를 못 찾았어도, 그나마 가장
        // 멀리 떨어진 후보를 기억해뒀다가 마지막에 사용한다
        if (nearest > bestScore) {
          bestScore = nearest;
          best = { x: x, y: y };
        }
      }

      // 극히 드물게 MAX_ATTEMPTS 동안 제외 조건조차 못 만족했다면
      // (거의 없겠지만) 타이틀/중앙 팝업 자리를 피한 왼쪽 아래
      // 구석으로 안전하게 대체한다
      if (!best) {
        best = { x: MARGIN, y: Math.max(TOP_EXCLUDE_Y, 100 - MARGIN) };
      }

      placed.push(best);
      el.style.left = best.x + "%";
      el.style.top = best.y + "%";
    });
  }

  randomizePositions();

  // ============================================
  // 손전등 효과: 무대 위에서 마우스(또는 터치)가 움직일 때마다
  // 안개(.focus-fog) 요소에 --spot-x/--spot-y CSS 변수를 갱신해서
  // radial-gradient 마스크의 구멍이 커서를 따라다니게 한다.
  // 무대를 벗어나면 구멍이 화면 밖으로 나가서 다시 완전히
  // 깜깜해진다
  // ============================================
  function setSpot(clientX, clientY) {
    const rect = stage.getBoundingClientRect();

    fog.style.setProperty(
      "--spot-x",
      clientX - rect.left + "px",
    );

    fog.style.setProperty(
      "--spot-y",
      clientY - rect.top + "px",
    );
  }

  function clearSpot() {
    fog.style.setProperty(
      "--spot-x",
      "-9999px",
    );

    fog.style.setProperty(
      "--spot-y",
      "-9999px",
    );
  }

  stage.addEventListener("mousemove", function (event) {
    setSpot(event.clientX, event.clientY);
  });

  stage.addEventListener("mouseleave", clearSpot);

  // 터치 기기에서는 손가락으로 무대 위를 훑으면 같은 방식으로
  // 손전등이 따라다니게 한다
  stage.addEventListener(
    "touchmove",
    function (event) {
      const touch = event.touches[0];

      if (touch) {
        setSpot(touch.clientX, touch.clientY);
      }
    },
    { passive: true },
  );

  stage.addEventListener("touchend", clearSpot);

  // ============================================
  // 캐릭터에 커서를 대면(누를 필요 없이) 볼록렌즈로 보는 것처럼
  // 살짝 커지면서(CSS :hover) 제목/설명을 읽어서 화면 중앙의
  // #focus-detail 패널에 보여준다. 한 번 찾은 캐릭터는 is-found
  // 클래스를 붙여서 안개(z-index 5)보다 위로 올라가고, 그
  // 뒤로는 손전등 없이도 항상 원래 이미지 그대로 보인다
  // ============================================
  let allFoundTriggered = false;

  function showDetailFor(character) {
    if (!detailPanel || !detailTitle || !detailText) {
      return;
    }

    const titleEl = character.querySelector(".focus-character-title");
    const textEl = character.querySelector(".focus-character-detail");

    detailTitle.textContent = titleEl ? titleEl.textContent.trim() : "";
    detailText.textContent = textEl ? textEl.textContent.trim() : "";

    character.classList.add("is-found");

    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");

    const foundCount = document.querySelectorAll(
      ".focus-character.is-found:not(.focus-character--shark)",
    ).length;

    // 이 힌트 문구는 언어별로 달라야 하는데(ko/en/ja 페이지가 이
    // 스크립트 하나를 같이 쓴다), 여기 JS 안에 한국어를 그대로
    // 박아두면 en/ja 페이지에서도 한국어가 그대로 노출된다. 대신
    // 각 언어 템플릿의 #focus-hint에 미리 넣어둔
    // data-hint-progress/data-hint-complete 문구를 읽어서 쓴다 —
    // "{n}"이라고 적어둔 자리를 지금까지 찾은 개수로 바꿔 끼운다
    if (hint) {
      if (foundCount >= characters.length) {
        hint.textContent = hint.dataset.hintComplete || "";
      } else if (hint.dataset.hintProgress) {
        hint.textContent = hint.dataset.hintProgress.replace(
          "{n}",
          String(foundCount),
        );
      }
    }

    // 3개를 다 찾으면 "누르지 않아도" 자동으로 잠금 해제되듯이
    // 어두운 배경이 사라지고 전체보기로 넘어간다. 방금 찾은
    // 3번째 캐릭터의 설명을 읽을 시간을 조금 주기 위해
    // 살짝 지연시킨다
    if (foundCount >= characters.length && !allFoundTriggered) {
      allFoundTriggered = true;

      window.setTimeout(function () {
        celebrateAllFound();
      }, 1500);
    }
  }

  function hideDetail() {
    if (!detailPanel) {
      return;
    }

    detailPanel.classList.remove("is-visible");
    detailPanel.setAttribute("aria-hidden", "true");
  }

  characters.forEach(function (character) {
    // 마우스는 hover만으로 바로 보여주고(누를 필요 없음),
    // 터치/키보드 사용자를 위해 click/focus도 그대로 지원한다
    character.addEventListener("mouseenter", function () {
      showDetailFor(character);
    });

    character.addEventListener("click", function () {
      showDetailFor(character);
    });

    character.addEventListener("focus", function () {
      showDetailFor(character);
    });

    // 커서를 캐릭터에서 떼면 설명 팝업도 같이 닫는다. 캐릭터
    // 자체는 is-found가 이미 붙어서 계속 그 자리에 원래 이미지로
    // 남아있으니(영구 노출), 팝업만 사라져도 "찾았다"는 상태는
    // 그대로 유지된다. 키보드로 Tab 이동해서 포커스가 벗어날
    // 때도(blur) 마찬가지로 닫는다
    character.addEventListener("mouseleave", function () {
      hideDetail();
    });

    character.addEventListener("blur", function () {
      hideDetail();
    });
  });

  if (detailClose) {
    detailClose.addEventListener("click", hideDetail);
  }

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      detailPanel &&
      detailPanel.classList.contains("is-visible")
    ) {
      hideDetail();
    }
  });

  // ============================================
  // 이스터에그: 상어는 누르는 게 아니라 커서만 가져다 대도(hover)
  // 놀라서 화면 정중앙으로 튀어나와 화면을 통째로 집어삼킬 듯
  // 커졌다가 사라지는 애니메이션을 재생한다. 손전등이 지나가는
  // 순간 커서가 정확히 그 자리에 있으니, "손전등으로 비추는 순간
  // 툭 튀어나오는" 느낌이 자연스럽게 만들어진다. 진짜 키워드가
  // 아니라서 설명 패널은 띄우지 않는다. 터치 기기는 hover가 없으니
  // touchstart로도 같은 반응을 준다.
  //
  // 무대(.focus-stage)와 identity-focus 섹션 모두 overflow:hidden이
  // 걸려있어서, 그 안에 absolute로 있는 상어가 아무리 커져도
  // 경계에서 잘려버린다. 그래서 트리거되는 순간 상어를
  // position:fixed로 바꿔서(지금 보이는 그 자리 그대로, px 좌표로
  // 고정) 그 좌표계를 완전히 벗어나게 하고, overflow도 잠깐
  // visible로 풀어준 다음 애니메이션을 재생한다.
  //
  // 그런데 position:fixed + z-index만으로는 부족했다 — identity-focus,
  // .focus-stage가 각각 자기 z-index(5, 0)로 독립된 쌓임 맥락을
  // 만들어놔서, 그 안의 상어가 z-index:9999를 줘도 그 맥락
  // 밖으로는(=body 직속인 네비게이터 위로는) 못 나간다. 그래서
  // 트리거되는 순간 상어 DOM 자체를 body의 바로 아래 자식으로
  // 옮겨서, 네비게이터(z-index:50)와 정확히 같은 층에서 직접
  // 비교되게 만든다 — 이러면 상어의 z-index:9999가 정말로
  // 네비게이터보다 위에 그려진다
  // ============================================
  if (shark) {
    // 상어가 화면 중앙까지 튀어나와 커지는 동안, 뒤로 페이지의
    // 다른 글자/요소가 비쳐 보인다는 피드백이 있었다. 상어 사진
    // 자체는 불투명하지만(중앙 부분 알파값 확인 완료), 그 뒤에
    // 아무것도 없으면 상어의 가장자리(그림자/안티에일리어싱)
    // 바깥쪽 배경이 그대로 비쳐서 마치 상어가 반투명한 것처럼
    // 보일 수 있다. 상어보다 한 층 아래(z-index 9998)에 화면
    // 전체를 덮는 새까만 막(backdrop)을 깔아서, 상어 뒤에는
    // 항상 확실한 불투명 배경만 있게 만든다 — 겸사겸사 "화면을
    // 집어삼킬 듯" 튀어나오는 임팩트도 더 강해진다
    let sharkBackdrop = document.querySelector("#focus-shark-backdrop");

    if (!sharkBackdrop) {
      sharkBackdrop = document.createElement("div");
      sharkBackdrop.id = "focus-shark-backdrop";
      sharkBackdrop.className = "focus-shark-backdrop";
      sharkBackdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(sharkBackdrop);
    }

    const triggerShark = function () {
      if (shark.classList.contains("is-triggered")) {
        return;
      }

      const rect = shark.getBoundingClientRect();

      const currentCenterX = rect.left + rect.width / 2;
      const currentCenterY = rect.top + rect.height / 2;

      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      const dx = viewportCenterX - currentCenterX;
      const dy = viewportCenterY - currentCenterY;

      // 뷰포트 가로 폭의 1.15배 크기가 되도록 배율을 계산해서,
      // 화면 크기와 상관없이 항상 "화면을 뒤덮는" 느낌을 준다
      const scale = (window.innerWidth * 1.15) / rect.width;

      shark.style.setProperty("--shark-dx", dx + "px");
      shark.style.setProperty("--shark-dy", dy + "px");
      shark.style.setProperty("--shark-scale", String(scale));

      // 지금 보이는 위치/크기를 그대로 px로 고정해두고 나서
      // body로 옮긴다 — rect는 이미 뷰포트 기준 좌표라, 부모가
      // 바뀌어도(=좌표 기준이 바뀌어도) 이 값 그대로 써도 화면상
      // 위치가 전혀 튀지 않는다
      shark.style.position = "fixed";
      shark.style.left = rect.left + "px";
      shark.style.top = rect.top + "px";
      shark.style.width = rect.width + "px";
      shark.style.height = rect.height + "px";
      shark.style.transform = "none";

      document.body.appendChild(shark);

      section.classList.add("is-shark-escaping");
      shark.classList.add("is-triggered");
      sharkBackdrop.classList.add("is-visible");

      // CSS의 focusSharkJump 애니메이션 총 길이(1.9s)와 맞춘다 —
      // 다 커진 채로 잠깐 멈춰 흔들리는 구간이 늘어났으니, 그
      // 구간이 다 끝나기 전에 미리 숨기거나 무대 경계를 되돌리면
      // 흔들리는 도중에 상어가 잘려 보일 수 있다. 백드롭은 상어
      // 자신이 마지막에 옅어지는 구간(85%~100%, 약 1615~1900ms)과
      // 함께 사라지도록 살짝 앞서 페이드아웃을 시작한다
      window.setTimeout(function () {
        sharkBackdrop.classList.remove("is-visible");
      }, 1550);

      window.setTimeout(function () {
        shark.style.visibility = "hidden";
        shark.style.pointerEvents = "none";
        section.classList.remove("is-shark-escaping");
      }, 1900);
    };

    shark.addEventListener("mouseenter", triggerShark);
    shark.addEventListener("touchstart", triggerShark, { passive: true });
  }

  // ============================================
  // skip 버튼: 숨바꼭질 무대 대신 3개 카드를 한 번에 보여주는
  // 전체보기로 전환한다(팝업이 아니라 같은 섹션 안에서 내용만
  // 바뀌는 방식). "닫기"를 누르면 다시 숨바꼭질 무대로 돌아간다.
  // 이 openExpandedView 함수는 skip 버튼뿐 아니라, 키워드 3개를
  // 다 찾았을 때 자동으로 열리는 celebrateAllFound에서도 그대로
  // 재사용한다
  // ============================================
  function openExpandedView() {
    section.classList.add("is-expanded");
    hideDetail();
    updateHeaderDarkState();

    if (!expandedPanel) {
      return;
    }

    // identity.css에 걸린 scroll-snap-type: mandatory와
    // scrollIntoView가 부딪히면, 스크롤이 끝나자마자 "가장 가까운
    // 섹션 시작점"으로 브라우저가 한 번 더 끌어당겨서 의도한
    // 것보다 훨씬 더 멀리 스크롤되는 문제가 있었다(Pursue
    // 섹션에서 겪었던 것과 같은 버그). 스크롤하는 동안만
    // 스냅을 꺼둔다
    window.requestAnimationFrame(function () {
      scrollIntoViewPausingSnap(expandedPanel);
    });
  }

  // identity.css의 scroll-snap-type: mandatory와 scrollIntoView가
  // 부딪히는 문제를 막는 함수. body/html에 클래스를 붙였다 떼는
  // 대신, 인라인 style로 scroll-snap-type을 직접 지정한다 —
  // 인라인 스타일은 스타일시트의 어떤 규칙보다도 항상 우선하므로
  // 우선순위 걱정 없이 확실하게 꺼진다(Pursue 섹션에서 클래스
  // 방식이 불안정했던 문제의 재발을 막기 위한 동일한 처리).
  // 스크롤이 "진짜로 끝난" 시점(scrollend 이벤트)에 원래 값으로
  // 되돌리고, scrollend를 지원하지 않는 아주 오래된 브라우저
  // 대비 넉넉한 안전장치(1800ms)도 같이 둔다
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

  // ============================================
  // 키워드 3개를 다 찾으면, "전체보기"를 누르지 않아도 검은
  // 배경/안개가 눈 녹듯이 서서히 사라지면서 자동으로 전체보기
  // 카드 화면이 뜬다. is-melting 클래스는 무대(.focus-stage)의
  // opacity를 서서히 0으로 낮추는 CSS 전환을 트리거하고, 그
  // 전환이 끝날 즈음 openExpandedView를 호출해 실제로
  // 전체보기로 전환한다
  // ============================================
  function celebrateAllFound() {
    section.classList.add("is-melting");

    window.setTimeout(function () {
      openExpandedView();
      section.classList.remove("is-melting");
    }, 1000);
  }

  if (skipButton) {
    skipButton.addEventListener("click", function () {
      openExpandedView();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      section.classList.remove("is-expanded");
      updateHeaderDarkState();

      window.requestAnimationFrame(function () {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }
});

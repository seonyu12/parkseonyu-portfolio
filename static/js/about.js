// ============================================
// about.js
// About 페이지의 세 인터랙션을 담당하는 작고 독립적인 스크립트.
//   1) About Me: 소개글에 커서를 올리면, 커서 주변 글자들이 마치
//      물 위에 뜬 나뭇잎처럼 커서를 피해 부드럽게 밀려난다
//   2) Profile: 서류(버튼) 중 하나를 클릭하면 폴더가 펼쳐진 채로
//      고정되고, 그 서류의 내용이 아래 상세 패널에 나타난다
//   3) My Message: 바이닐을 클릭하면 "재생 중" 상태가 토글되어
//      사운드웨이브가 계속 움직인다
// 이 페이지가 없는 곳(다른 언어 페이지 등)에서 실행돼도 아무 일도
// 일어나지 않도록, 필요한 요소가 하나도 없으면 조용히 종료한다
// ============================================

// ============================================
// About Me 소개글 인터랙션: 커서와 글자가 서로 겹치지 못하는
// 물체인 것처럼, 커서에 가까운 글자일수록 커서 반대 방향으로
// 밀려난다("물 위에 뜬 나뭇잎 사이로 손을 넣어 젓는" 느낌).
// 커서를 올리지 않은 평소에는 원래 텍스트 그대로 아무 변화가
// 없고, 커서가 글자 가까이 지나갈 때만 그 근처 글자들만 반응한다.
// 커서가 멀어지면 자연스럽게(스프링처럼) 제자리로 돌아온다
// ============================================
function initIntroLetters() {
  const container = document.querySelector(".about-intro-text");
  const paragraphs = container
    ? container.querySelectorAll("p")
    : [];

  if (!container || !paragraphs.length) {
    return;
  }

  // 모션에 민감한 사용자를 위한 설정(운영체제의 "동작 줄이기")을
  // 켜둔 경우엔 이 장식 효과를 아예 켜지 않는다
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const letters = [];

  // 각 문단의 글자를 하나하나 <span>으로 감싸서 개별적으로
  // 움직일 수 있게 만든다. 스크린리더는 글자 하나하나가 아니라
  // 원래 문장을 그대로 읽어야 하므로, 시각적으로만 보이는 글자
  // 조각들은 aria-hidden으로 숨기고, 원래 문장은 화면에 안 보이게
  // (.visually-hidden) 따로 남겨서 보조기술이 읽을 수 있게 한다
  paragraphs.forEach(function (p) {
    const originalText = p.textContent;

    const srText = document.createElement("span");
    srText.className = "visually-hidden";
    srText.textContent = originalText;

    const visualWrap = document.createElement("span");
    visualWrap.className = "intro-letters";
    visualWrap.setAttribute("aria-hidden", "true");

    Array.from(originalText).forEach(function (character) {
      if (/\s/.test(character)) {
        // 띄어쓰기는 span으로 감싸지 않고 그냥 글자 그대로 둔다 —
        // span으로 감싸면 브라우저마다 공백 처리 방식이 달라져서
        // 단어 사이 간격이 미묘하게 어긋날 수 있다
        visualWrap.appendChild(document.createTextNode(character));
        return;
      }

      const letterSpan = document.createElement("span");
      letterSpan.className = "intro-letter";
      letterSpan.textContent = character;
      visualWrap.appendChild(letterSpan);
      letters.push(letterSpan);
    });

    p.textContent = "";
    p.appendChild(srText);
    p.appendChild(visualWrap);
  });

  // 각 글자의 "원래 자리"를 미리 재둔다. transform은 레이아웃에
  // 영향을 주지 않으니 offsetLeft/offsetTop(부모 기준 좌표)은
  // 글자가 밀려나 있어도 항상 원래 자리를 가리킨다. container에
  // position:relative를 줘서(about.css) 이 offsetLeft/Top의
  // 기준(offsetParent)이 항상 container가 되게 한다
  function measureRestPositions() {
    letters.forEach(function (span) {
      span._restX = span.offsetLeft + span.offsetWidth / 2;
      span._restY = span.offsetTop + span.offsetHeight / 2;
      if (typeof span._curX !== "number") {
        span._curX = 0;
        span._curY = 0;
      }
    });
  }

  measureRestPositions();
  window.addEventListener("resize", measureRestPositions);

  // SUIT 웹폰트가 font-display:swap으로 늦게 로드되면 글자 너비가
  // 살짝 바뀌면서 "원래 자리"가 미세하게 어긋날 수 있다 — 폰트
  // 로딩이 끝나면 한 번 더 정확히 재보정한다
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureRestPositions);
  }

  const REACT_RADIUS = 68; // 이 거리(px) 안의 글자만 반응한다
  const MAX_PUSH = 20; // 가장 가까울 때 밀려나는 최대 거리(px)
  const EASE = 0.18; // 목표 위치로 다가가는 속도 — 작을수록 더 부드럽고 느긋하게 따라온다

  let pointerX = null;
  let pointerY = null;
  let animating = false;

  function tick() {
    const containerRect = container.getBoundingClientRect();
    let stillSettling = false;

    letters.forEach(function (span) {
      let targetX = 0;
      let targetY = 0;

      if (pointerX !== null) {
        const restViewportX = containerRect.left + span._restX;
        const restViewportY = containerRect.top + span._restY;

        const dx = restViewportX - pointerX;
        const dy = restViewportY - pointerY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

        if (distance < REACT_RADIUS) {
          // 커서와 글자가 서로 겹치지 못하는 물체인 것처럼, 가까울수록
          // (distance가 0에 가까울수록) 더 세게 밀려난다
          const strength = 1 - distance / REACT_RADIUS;
          const push = strength * MAX_PUSH;
          targetX = (dx / distance) * push;
          targetY = (dy / distance) * push;
        }
      }

      span._curX += (targetX - span._curX) * EASE;
      span._curY += (targetY - span._curY) * EASE;

      // 나뭇잎이 물살에 살짝 기우는 것처럼, 밀려난 방향에 따라
      // 아주 약간만 회전도 같이 준다
      const rotate = Math.max(-9, Math.min(9, span._curX * 0.45));

      span.style.transform =
        "translate(" +
        span._curX.toFixed(2) +
        "px, " +
        span._curY.toFixed(2) +
        "px) rotate(" +
        rotate.toFixed(2) +
        "deg)";

      if (Math.abs(targetX - span._curX) > 0.05 || Math.abs(targetY - span._curY) > 0.05) {
        stillSettling = true;
      }
    });

    if (pointerX !== null || stillSettling) {
      window.requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  function startAnimatingIfNeeded() {
    if (!animating) {
      animating = true;
      window.requestAnimationFrame(tick);
    }
  }

  container.addEventListener("mousemove", function (event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    startAnimatingIfNeeded();
  });

  container.addEventListener("mouseleave", function () {
    // 커서가 떠나면 목표 지점이 다시 "원래 자리"(0,0)가 되고,
    // tick()이 스스로 알아서 부드럽게 복귀시킨 뒤 멈춘다
    pointerX = null;
    pointerY = null;
    startAnimatingIfNeeded();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initIntroLetters();

  const profileSection = document.querySelector("#about-profile");
  const figure = document.querySelector("#profile-figure");
  const papers = document.querySelectorAll(".profile-paper");
  const detail = document.querySelector("#profile-detail");
  const detailClose = document.querySelector("#profile-detail-close");
  const panels = document.querySelectorAll(".profile-panel");
  const vinylButton = document.querySelector("#vinyl-button");
  const messageAudio = document.querySelector("#about-message-audio");

  if (!figure && !vinylButton) {
    return;
  }

  // about.css의 scroll-snap-type: mandatory와 scrollIntoView가
  // 부딪히면, 스크롤이 끝나자마자 "가장 가까운 화면 시작점"으로
  // 브라우저가 한 번 더 끌어당겨서 의도한 것보다 훨씬 더 멀리
  // 스크롤되는 문제가 있다(Identity 페이지에서 이미 겪었던 것과
  // 같은 버그). 스크롤하는 동안만 스냅을 꺼둔다
  // onSettled(있으면)는 스크롤이 다 끝난 뒤(scrollend 또는 1800ms
  // 안전장치) 딱 한 번 실행된다 — 스크롤이 "끝난 뒤에만" 안전하게
  // 할 수 있는 후처리(예: 방금 지나온 상세 페이지를 완전히 접어서
  // display:none으로 되돌리기)를 여기 넣어둔다
  function scrollIntoViewPausingSnap(target, onSettled) {
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

      if (typeof onSettled === "function") {
        onSettled();
      }
    }

    window.addEventListener("scrollend", resume, { once: true });
    window.setTimeout(resume, 1800);

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // ============================================
  // Profile: 서류 버튼을 누르면 그 서류가 다루는 내용(Education/
  // Skills & Certifications/Experience)을 상세 페이지(#profile-detail,
  // 이제 about-profile과는 별개의 독립된 풀스크린 섹션)에 보여주고,
  // 폴더도 펼쳐진 채로 고정한다(is-open). 다른 서류를 다시 누르면
  // 패널 내용만 바뀌고, 이미 열려 있던 패널을 다시 누르면 닫힌다.
  // 닫으면 서류도 다시 접히고(is-open 제거), profile 화면으로
  // 부드럽게 되돌아간다
  // ============================================
  function openPanel(name) {
    panels.forEach(function (panel) {
      panel.classList.toggle("is-visible", panel.dataset.panel === name);
    });

    if (detail) {
      detail.classList.add("is-visible");
      detail.setAttribute("aria-hidden", "false");
    }

    if (figure) {
      figure.classList.add("is-open");
    }

    window.requestAnimationFrame(function () {
      if (detail) {
        scrollIntoViewPausingSnap(detail);
      }
    });
  }

  function closePanel() {
    // 여기서 곧바로 detail.classList.remove("is-visible")를 하면
    // (= display:none으로 즉시 접히면) 문서 전체 높이가 그 자리에서
    // 훅 줄어들면서, 지금 보고 있던 스크롤 위치가 순간적으로 그
    // 아래에 있던 My Message(레코드판) 화면으로 밀려버린다 — "엑스를
    // 누르면 레코드판이 잠깐 보인 다음 profile로 올라가는" 버그가
    // 바로 이거였다. 그래서 detail은 일단 그대로 둔 채(칸을 차지한
    // 채) profile로 스크롤부터 끝내고, 다 도착한 뒤에야(onSettled)
    // detail을 접는다 — 그때는 이미 화면이 profile을 지나온
    // 상태라 detail을 접어도(그 아래 있으니) 지금 보이는 화면에는
    // 영향이 없다
    if (detail) {
      detail.setAttribute("aria-hidden", "true");
    }

    panels.forEach(function (panel) {
      panel.classList.remove("is-visible");
    });

    // 서류를 다시 접는다 — 이게 빠져 있으면 패널을 닫아도 서류
    // 3장이 계속 펼쳐진 채로 남아있는 것처럼 보인다
    if (figure) {
      figure.classList.remove("is-open");
    }

    if (profileSection) {
      scrollIntoViewPausingSnap(profileSection, function () {
        if (detail) {
          detail.classList.remove("is-visible");
        }
      });
    } else if (detail) {
      detail.classList.remove("is-visible");
    }
  }

  papers.forEach(function (paper) {
    paper.addEventListener("click", function () {
      const name = paper.dataset.panel;

      const targetPanel = Array.prototype.find.call(
        panels,
        function (panel) {
          return panel.dataset.panel === name;
        },
      );

      const alreadyShown =
        detail &&
        detail.classList.contains("is-visible") &&
        targetPanel &&
        targetPanel.classList.contains("is-visible");

      if (alreadyShown) {
        closePanel();
      } else {
        openPanel(name);
      }
    });
  });

  if (detailClose) {
    detailClose.addEventListener("click", closePanel);
  }

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      detail &&
      detail.classList.contains("is-visible")
    ) {
      closePanel();
    }
  });

  // ============================================
  // My Message: 바이닐을 누르면 실제 음성 파일(#about-message-audio)이
  // 재생/일시정지된다. is-playing 클래스는 이제 "내가 재생 버튼을
  // 눌렀는지"가 아니라 audio 태그의 실제 play/pause/ended 이벤트를
  // 따라간다 — 그래야 재생이 끝났을 때 원반/사운드웨이브 애니메이션도
  // 같이 멈춘다. hover만으로도 CSS가 미리보기처럼 반응하는 건 그대로
  // 유지된다(실제 재생 여부와는 무관한 시각 효과)
  //
  // static/audio/about/message.mp3 자리에 음성 파일이 아직 없어도
  // 페이지는 깨지지 않는다 — play()가 실패하면 조용히 무시한다
  // ============================================
  if (vinylButton && messageAudio) {
    // ko/en/ja 세 언어가 이 스크립트 하나를 같이 쓰기 때문에, 여기서
    // "메시지 일시정지"를 그대로 하드코딩하면 영어/일본어 페이지에서도
    // 재생 버튼을 누르는 순간 한국어로 바뀌어버린다. 대신 템플릿의
    // data-label-play/data-label-pause 속성에서 각 언어에 맞는
    // 문구를 읽어온다(Focus 힌트 텍스트에도 같은 방식을 썼다)
    const playLabel = vinylButton.dataset.labelPlay || "메시지 재생";
    const pauseLabel = vinylButton.dataset.labelPause || "메시지 일시정지";

    function setPlayingState(isPlaying) {
      vinylButton.classList.toggle("is-playing", isPlaying);
      vinylButton.setAttribute("aria-pressed", String(isPlaying));
      vinylButton.setAttribute(
        "aria-label",
        isPlaying ? pauseLabel : playLabel,
      );
    }

    vinylButton.addEventListener("click", function () {
      if (messageAudio.paused) {
        const playResult = messageAudio.play();

        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(function () {
            // 아직 음성 파일이 업로드되지 않았거나 재생할 수 없는
            // 경우 — 사용자에게 에러를 보여주는 대신 그냥 재생
            // 안 된 상태로 조용히 둔다
            setPlayingState(false);
          });
        }
      } else {
        messageAudio.pause();
      }
    });

    messageAudio.addEventListener("play", function () {
      setPlayingState(true);
    });

    messageAudio.addEventListener("pause", function () {
      setPlayingState(false);
    });

    messageAudio.addEventListener("ended", function () {
      setPlayingState(false);
    });
  } else if (vinylButton) {
    // audio 태그 자체가 없는 예외적인 경우를 대비한 안전장치 —
    // 예전처럼 클래스만 토글한다
    vinylButton.addEventListener("click", function () {
      const isPlaying = vinylButton.classList.toggle("is-playing");
      vinylButton.setAttribute("aria-pressed", String(isPlaying));
    });
  }
});

// ============================================
// nav_spotlight.js
// 메뉴 텍스트 하나하나에 마우스를 올렸을 때만
// 그 자리에 무대 조명처럼 빛줄기 + 바닥 웅덩이가 나타나는 스크립트
// (마우스를 계속 따라다니지 않고, 메뉴 위로 올라간 순간 그 위치로 이동)
// 현재 페이지에 해당하는 메뉴는 마우스가 없어도 항상 켜져 있다
// + 메뉴를 클릭해서 페이지가 이동할 땐, 그 순간 위치에 스포트라이트를 고정시켜서
//   페이지 전환 직전에 위치가 어색하게 튀는 현상을 방지한다
// ============================================

// "DOMContentLoaded"는 HTML 태그들이 다 준비된 시점에 발생하는 이벤트다.
// 이 안의 코드는 그 시점에 딱 한 번 실행된다.
document.addEventListener("DOMContentLoaded", function () {

    // 위에서 아래로 떨어지는 "빛줄기" 역할을 할 div를 새로 만들어 body에 붙인다
    // 실제 모양(그라데이션 등)은 CSS의 .nav-spotlight-beam 클래스가 담당한다
    const beam = document.createElement("div");
    beam.className = "nav-spotlight-beam";
    document.body.appendChild(beam);

    // 빛줄기가 바닥(헤더 하단)에 닿는 자리에 생기는 "웅덩이" 역할을 할 div
    const pool = document.createElement("div");
    pool.className = "nav-spotlight-pool";
    document.body.appendChild(pool);

    const header = document.querySelector(".site-header");
    // 만약 이 페이지에 헤더 자체가 없다면(.site-header를 못 찾으면) 더 이상 진행할 필요가 없으므로 함수를 끝낸다
    if (!header) return;
  
    // 로고를 제외한, 실제 메뉴 텍스트 링크들만 모은다
    const navLinks = header.querySelectorAll("nav a:not(.logo)");
  
    // 지금 페이지에 해당하는 메뉴(active 클래스가 붙은 링크)
    const activeLink = header.querySelector("nav a.active");

    // ============================================
    // 메뉴를 클릭해서 페이지 이동이 시작되면 true로 바뀌는 변수
    // 이게 true가 되면, 그 이후에 어떤 mouseenter/mouseleave 이벤트가 와도
    // 위치를 다시 계산하지 않고 무시한다
    // (페이지가 실제로 넘어가면 스크립트 자체가 새로 실행되면서 이 값도 다시 false로 초기화된다)
    // ============================================
    let isNavigating = false;
  
  
    // ============================================
    // 헤더의 실제 높이를 측정해서, 빛줄기/웅덩이가
    // 정확히 헤더 하단 구분선에서 끝나도록 크기를 맞추는 함수
    // ============================================
    function updateHeaderMetrics() {
      const rect = header.getBoundingClientRect();
      const headerBottom = rect.bottom;
      beam.style.height = `${headerBottom}px`;
      const poolHeight = pool.offsetHeight || 26;
      pool.style.top = `${headerBottom - poolHeight}px`;
    }
  
  
    // 특정 x좌표(가로 위치)에 스포트라이트를 표시하는 함수
    function showSpotlightAt(x) {
      // 이미 페이지 이동이 시작됐다면, 더 이상 위치를 바꾸지 않고 그대로 둔다
      if (isNavigating) return;

      updateHeaderMetrics();
      beam.classList.add("visible");
      pool.classList.add("visible");
      beam.style.left = `${x}px`;
      pool.style.left = `${x}px`;
    }
  
    function hideSpotlight() {
      // 이동 중이면 숨김 처리도 하지 않고 그대로 둔다
      if (isNavigating) return;

      beam.classList.remove("visible");
      pool.classList.remove("visible");
    }
  
    // 특정 링크 요소의 가로 중심 좌표를 계산하는 함수
    function getLinkCenterX(link) {
      const rect = link.getBoundingClientRect();
      return rect.left + rect.width / 2;
    }
  
  
    // ============================================
    // 페이지 로드 직후엔 스포트라이트를 아예 표시하지 않는다
    // (이미지 로딩 등으로 레이아웃이 아직 확정 안 됐을 수 있어서,
    //  이 시점에 바로 위치를 계산하면 부정확한 위치에 잠깐 나타났다가
    //  다시 옮겨지는 "튐" 현상이 생기기 때문)
    //
    // 대신 setTimeout으로 아주 짧은 시간(50ms)만 기다린 후에
    // 딱 한 번, 이미 레이아웃이 안정된 상태에서 정확한 위치에 나타나게 한다
    // 50ms는 사람 눈에는 거의 감지되지 않을 만큼 짧은 시간이다
    // ============================================
    if (activeLink) {
        setTimeout(function () {
          showSpotlightAt(getLinkCenterX(activeLink));
        }, 50);
      }
  
  
    // ============================================
    // 메뉴 링크 하나하나에 개별적으로 이벤트를 건다
    // ============================================
    navLinks.forEach(function (link) {
  
      link.addEventListener("mouseenter", function () {
        showSpotlightAt(getLinkCenterX(link));
      });

      // ============================================
      // 메뉴 링크를 클릭하는 순간, isNavigating을 true로 바꿔서
      // 이후의 모든 위치 재계산(mouseleave로 인한 복귀 등)을 차단한다
      // 스포트라이트는 클릭한 그 순간의 위치에 고정된 채로 페이지가 넘어간다
      // ============================================
      link.addEventListener("click", function () {
        isNavigating = true;
      });
    });
  
    // ============================================
    // 마우스가 "헤더 전체"를 완전히 벗어났을 때만 active 메뉴 위치로 복귀한다
    // ============================================
    header.addEventListener("mouseleave", function () {
      if (activeLink) {
        showSpotlightAt(getLinkCenterX(activeLink));
      } else {
        hideSpotlight();
      }
    });
  
  
    // 창 크기가 바뀌면(반응형 등) 헤더 위치/크기가 달라질 수 있으니 다시 계산
    window.addEventListener("resize", function () {
      if (activeLink) {
        showSpotlightAt(getLinkCenterX(activeLink));
      }
    });
  
});
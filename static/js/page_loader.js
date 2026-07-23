// ============================================
// page_loader.js
// 페이지가 2초 안에 다 로딩되면 로딩 화면 없이 바로 콘텐츠를 보여주고,
// 2초가 넘어가면 그제서야 로딩 스피너를 보여주는 스크립트
// ============================================

// (function () { ... })(); 형태를 IIFE(즉시 실행 함수)라고 부른다.
// 함수를 정의하자마자 바로 실행해 버리는 문법으로, 안에서 만든 변수(loader, isPageLoaded 등)가
// 바깥의 전역(global) 공간을 더럽히지 않고 이 함수 안에서만 존재하게 만들어 준다.
(function () {

    // id가 "page-loader"인 로딩 오버레이 요소를 찾는다.
    // base.html에 해당 요소가 없는 페이지라면(loader가 null) 아무것도 하지 않고 끝낸다.
    const loader = document.getElementById("page-loader");
    if (!loader) return;
  
    // ============================================
    // 아직 "로딩이 다 끝났는지" 여부를 기억하는 변수
    // ============================================
    let isPageLoaded = false;
  
    // ============================================
    // 2초(2000ms) 후에 실행될 타이머
    // 이 시점에도 아직 로딩이 안 끝났다면(isPageLoaded가 false라면)
    // 그제서야 스피너 애니메이션을 눈에 보이게 만든다
    // ============================================
    const showSpinnerTimer = setTimeout(function () {
      if (!isPageLoaded) {
        loader.classList.add("show-spinner");
      }
    }, 2000);
  
    // ============================================
    // window의 "load" 이벤트: 이미지 등 모든 리소스가 완전히 로드된 시점에 발생
    // ============================================
    window.addEventListener("load", function () {
      isPageLoaded = true;
  
      // 혹시 아직 2초가 안 지났다면, 스피너를 보여줄 필요가 없어졌으니 예약을 취소
      clearTimeout(showSpinnerTimer);
  
      // 로딩 오버레이에 "숨기기" 클래스를 추가해서 부드럽게 사라지도록 함
      loader.classList.add("hide");
  
      // transition 애니메이션(0.4초 정도)이 끝난 후, 완전히 화면에서 제거
      setTimeout(function () {
        loader.remove();
      }, 400);
    });
  
  })();
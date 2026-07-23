// three.js: 브라우저에서 3D 그래픽(구름 모델, 카메라, 조명 등)을 그리게 해주는 라이브러리
import * as THREE from 'three';

// GLTFLoader: .glb/.gltf 형식의 3D 모델 파일을 불러오는 도구
import {
  GLTFLoader,
} from 'three/addons/loaders/GLTFLoader.js';

// MarchingCubes: 여러 개의 둥근 덩어리(로브)를 액체처럼 부드럽게 하나로 이어 붙여
// 보여주는 "메타볼(metaball)" 효과를 만드는 도구. 구름들이 하나로 합쳐지는 장면에 쓰인다.
import {
  MarchingCubes,
} from 'three/addons/objects/MarchingCubes.js';

// identity_ko.html 안의 #identity-scene 요소를 찾는다.
// 이 스크립트는 여러 언어(ko/en/ja) 페이지에서 공용으로 쓰일 수도 있으므로,
// 혹시 이 요소가 없는 페이지에서 실행돼도 에러 없이 조용히 지나가도록 if(root)로 감싼다.
const root =
  document.querySelector(
    '#identity-scene',
  );

if (root) {
  // 3D 연출을 시작한다. 모델 로딩 실패 등 예상치 못한 에러가 나면
  // .catch로 잡아서 콘솔에 기록하고, showFallback으로 대체 화면을 보여준다.
  startIdentityExperience(root)
    .catch((error) => {
      console.error(
        '[identity]',
        error,
      );

      showFallback(root);
    });
}

// 이 페이지 인터랙션 전체를 시작시키는 메인 함수.
// #identity-scene 안의 필수 요소들을 찾고, 3D 구름/비/텍스트 연출을 순서대로 세팅한 뒤
// 매 프레임 화면을 다시 그리는 render 루프를 시작한다. async인 이유는 3D 모델(.glb) 파일을
// 다 불러올 때까지 await로 기다려야 하기 때문이다.
async function startIdentityExperience(
  root,
) {
  const mount =
    root.querySelector(
      '#cloud-3d-mount',
    );

  const rainCanvas =
    root.querySelector(
      '#weather-rain-canvas',
    );

  const textRainLayer =
    root.querySelector(
      '#text-rain-layer',
    );

  const hint =
    root.querySelector(
      '#identity-hint',
    );

  const skipButton =
    root.querySelector(
      '#identity-skip',
    );

  const status =
    root.querySelector(
      '#identity-status',
    );

  const body =
    root.querySelector(
      '#identity-body',
    );

  if (
    !mount ||
    !rainCanvas ||
    !textRainLayer ||
    !hint ||
    !skipButton ||
    !body
  ) {
    throw new Error(
      'Identity HTML 필수 요소가 없습니다.',
    );
  }

  const baseUrl =
    mount.dataset.baseModel;

  const heroUrl =
    mount.dataset.heroModel;

  if (!baseUrl || !heroUrl) {
    throw new Error(
      'GLB 모델 경로가 없습니다.',
    );
  }

  const mobile =
    matchMedia(
      '(max-width: 700px)',
    ).matches;

  const coarsePointer =
    matchMedia(
      '(pointer: coarse)',
    ).matches;

  const reducedMotion =
    matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

  // ============================================
  // 화면 안내 문구(스크린리더용 hint/status)의 다국어 처리.
  // <html lang="..."> 값(base.html에서 서버가 라우트의 lang으로 채워줌)을
  // 그대로 읽어서, 아래 STRINGS 사전에서 그 언어의 문장을 찾아 쓴다.
  // 사전에 없는 언어거나 lang 속성이 비어있으면 한국어로 대체한다.
  // 화면에 실제로 보이는 본문 텍스트(타이틀, 문단)는 언어별 HTML
  // 파일(identity_ko/en/ja.html) 자체에 따로 번역되어 있고, 여기
  // STRINGS는 JS가 동적으로 만들어내는 안내 문구만 다룬다.
  // ============================================
  const lang =
    document.documentElement.lang ||
    'ko';

  const STRINGS = {
    ko: {
      hintTouch:
        '화면을 터치하면 구름들이 한곳으로 모입니다',
      hintMouse:
        '마우스를 움직이면 구름들이 한곳으로 모입니다',
      statusGathering:
        '구름들이 커서를 향해 움직입니다.',
      statusIdle:
        '다섯 구름이 하늘에 떠 있습니다.',
      statusSettled:
        '다섯 구름이 하나의 표면으로 합쳐졌습니다.',
      statusTextRain:
        '먹구름에서 글자가 비처럼 내려와 본문이 됩니다.',
      statusFinal:
        '인트로가 끝났습니다.',
    },
    en: {
      hintTouch:
        'Touch the screen to draw the clouds together',
      hintMouse:
        'Move your mouse to draw the clouds together',
      statusGathering:
        'The clouds are moving toward the cursor.',
      statusIdle:
        'Five clouds are floating in the sky.',
      statusSettled:
        'The five clouds have merged into one surface.',
      statusTextRain:
        'Letters fall like rain from the storm cloud to form the text.',
      statusFinal:
        'The intro has finished.',
    },
    ja: {
      hintTouch:
        '画面をタッチすると雲が一か所に集まります',
      hintMouse:
        'マウスを動かすと雲が一か所に集まります',
      statusGathering:
        '雲がカーソルに向かって動いています。',
      statusIdle:
        '5つの雲が空に浮かんでいます。',
      statusSettled:
        '5つの雲が一つの塊に合わさりました。',
      statusTextRain:
        '雨雲から文字が雨のように降り注ぎ、本文になります。',
      statusFinal:
        'イントロが終了しました。',
    },
  };

  // t(key)를 호출하면 현재 lang에 맞는 문장을, 없으면 한국어 문장을 돌려준다
  function t(key) {
    return (
      STRINGS[lang]?.[key] ??
      STRINGS.ko[key]
    );
  }

  const CONFIG = {
    frustumHeight: 9.2,

    // "지금의 1/3 크기여도 충분하다"는 피드백을 반영해 추가로 축소
    baseExtent:
      mobile ? 0.29 : 0.38,

    // hero(합쳐진 먹구름)도 같은 비율로 축소 (해 아이콘 정도 크기)
    heroExtent:
      mobile ? 0.4 : 0.52,

    cloudSpeeds:
      mobile
        ? [
            1.5,
            1.65,
            1.58,
            1.76,
            1.55,
          ]
        : [
            1.9,
            2.08,
            1.98,
            2.2,
            1.94,
          ],

    // 사용자 피드백: "모이는 건 괜찮은데 모인 다음 합쳐지는 게 너무
    // 오래 걸려서 지루하다" — 모인 뒤 실제 합체가 시작되기까지의
    // 대기 시간을 줄여서 더 민감하게(빠르게) 반응하도록 낮췄다
    minGatherTime: 1.6,
    forceMergeTime: 4.5,

    // 메타볼(뭉친 덩어리) 상태로만 오래 머물면 "그냥 하나로 뭉쳐서
    // 가만히 있는 덩어리"처럼 보이기 쉽다. hero 구름이 더 빨리 등장해서
    // 그 위를 덮어버리도록 이 시간을 짧게 줄였다 (쫀득한 출렁임은
    // updateSettle의 wobble이 짧아진 시간 안에서도 여전히 느껴진다)
    settleDuration: 0.48,
    heroBirthDuration: 0.62,
    heroCenterDuration: 1.9,
    stormHoldDuration: 0.75,
    clearingDuration: 2.4,

    metaResolution:
      mobile ? 26 : 32,

    metaMaxPolygons:
      mobile ? 18000 : 32000,

    metaIsolation: 64,
    metaSubtract: 12,

    dayColor:
      new THREE.Color(
        '#f4f5f8',
      ),

    stormColor:
      new THREE.Color(
        '#3d434d',
      ),

    // 스토리보드 1번 장면: 커서를 움직이기 전에는 비가 오지 않는다.
    // 커서가 움직여서 구름들이 모이기 시작할 때(gatherRain)부터 비가 내린다.
    initialRain: 0,
    gatherRain: 0.45,
    stormRain: 0.92,
    textRain: 0.52,
  };

  const PHASE = {
    LOADING: 'loading',
    IDLE: 'idle',
    GATHER: 'gather',
    SETTLE: 'settle',
    HERO_BIRTH: 'hero-birth',
    HERO_CENTER: 'hero-center',
    STORM_HOLD: 'storm-hold',
    TEXT_RAIN: 'text-rain',
    CLEARING: 'clearing',
    FINAL: 'final',
  };

  document.body.classList.add(
    'identity-intro-active',
  );

  hint.textContent =
    coarsePointer
      ? t('hintTouch')
      : t('hintMouse');

  const rainTargets =
    prepareRainTargets(body);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const weatherRain =
    new WeatherRain(
      rainCanvas,
      mobile,
      CONFIG.initialRain,
    );

  weatherRain.resize();

  const renderer =
    new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference:
        'high-performance',
    });

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio || 1,
      mobile ? 1.3 : 1.6,
    ),
  );

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure =
    1.08;

  renderer.domElement.setAttribute(
    'aria-hidden',
    'true',
  );

  mount.replaceChildren(
    renderer.domElement,
  );

  const scene =
    new THREE.Scene();

  const camera =
    new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0.1,
      50,
    );

  camera.position.set(
    0,
    0,
    10,
  );

  camera.lookAt(
    0,
    0,
    0,
  );

  scene.add(
    new THREE.HemisphereLight(
      0xffffff,
      0x8e91a0,
      2.3,
    ),
  );

  const keyLight =
    new THREE.DirectionalLight(
      0xffffff,
      2.75,
    );

  keyLight.position.set(
    -4.5,
    5.5,
    8,
  );

  scene.add(
    keyLight,
  );

  const fillLight =
    new THREE.DirectionalLight(
      0xc9d5eb,
      1.05,
    );

  fillLight.position.set(
    5,
    0.5,
    5,
  );

  scene.add(
    fillLight,
  );

  const loader =
    new GLTFLoader();

  const [
    baseGltf,
    heroGltf,
  ] = await Promise.all([
    loader.loadAsync(
      baseUrl,
    ),

    loader.loadAsync(
      heroUrl,
    ),
  ]);

  const smallRoot =
    new THREE.Group();

  scene.add(
    smallRoot,
  );

  const sizeFactors = [
    1.0,
    0.9,
    1.07,
    0.94,
    0.86,
  ];

  // 예전에는 idleLayout(고정 앵커)/gatherSlots(고정 4칸 격자)로
  // 구름들을 딱딱하게 정렬시켰는데, "징그럽게 칸 쳐지듯 합쳐진다"는
  // 피드백이 있어 제거했다. 대신 각 구름은 넓은 화면을 자유롭게
  // 배회하다가(roamTarget을 계속 새로 뽑음) 커서가 움직이면 그
  // 목표점이 서서히 커서 쪽으로 끌려가는 방식으로 바뀐다.
  // 화면 크기에 따라 배회 가능한 범위는 resize()에서 갱신된다.
  const roamBounds = {
    halfWidth: 4,
    halfHeight: 2.4,
  };

  // 구름/hero가 헤더를 절대 넘어가지 않도록 하는 world-Y 상한선.
  // 실제 .site-header 높이를 재서 world 좌표로 환산해 resize()에서 갱신한다.
  let headerLimitY = 3.4;

  const smallClouds =
    sizeFactors.map(
      (factor, index) => {
        const group =
          new THREE.Group();

        const visual =
          createNormalizedCloud(
            baseGltf.scene,
            CONFIG.dayColor,
          );

        visual.scale.setScalar(
          CONFIG.baseExtent *
            factor,
        );

        group.add(
          visual,
        );

        group.userData.visual =
          visual;

        group.userData.factor =
          factor;

        group.userData.seed =
          1.3 +
          index * 2.17;

        group.userData.speed =
          CONFIG.cloudSpeeds[index];

        // 자유 배회를 위한 상태: 지금 향하고 있는 목표점과,
        // 그 목표를 새로 뽑기까지 남은 시간(초)
        group.userData.roamTarget =
          new THREE.Vector3();

        group.userData.roamTimer =
          0;

        group.userData.roamSeeded =
          false;

        smallRoot.add(
          group,
        );

        return group;
      },
    );

  // ============================================
  // 작은 구름들의 "바닥 그림자"
  // 이 장면엔 실제로 그려진 바닥(땅) 오브젝트는 없지만, 구름 하나하나
  // 아래에 부드럽고 흐릿한 타원을 하나씩 깔아두면 "공중에 떠 있다"는
  // 느낌이 훨씬 또렷해진다. Three.js의 정식 그림자 시스템(shadow map)을
  // 쓰려면 바닥 역할을 하는 평면 메쉬 + 조명의 castShadow 설정이 다
  // 필요해서 번거로운데, 여기서는 그 대신 구름 개수만큼 반투명한
  // "그림자 스프라이트"를 만들어 구름의 X 위치만 따라가게 하는
  // 훨씬 가벼운 방식을 쓴다. 항상 카메라를 향하는 Sprite라서
  // 회전 걱정 없이 항상 납작한 타원처럼 보인다.
  const shadowTexture =
    createSoftShadowTexture();

  const cloudShadowRoot =
    new THREE.Group();

  scene.add(
    cloudShadowRoot,
  );

  const cloudShadows =
    sizeFactors.map(
      (factor) => {
        const material =
          new THREE.SpriteMaterial(
            {
              map: shadowTexture,
              color: 0x2c2a24,
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
            },
          );

        const sprite =
          new THREE.Sprite(
            material,
          );

        // 그림자는 원래 구름 크기(factor)에 비례해서 커지되,
        // 옆으로 좀 더 납작하게(가로로 넓게) 눌러서 진짜 바닥에
        // 깔린 그림자처럼 보이게 한다
        const shadowSize =
          CONFIG.baseExtent *
          factor *
          2.6;

        sprite.scale.set(
          shadowSize,
          shadowSize * 0.42,
          1,
        );

        cloudShadowRoot.add(
          sprite,
        );

        return sprite;
      },
    );

  // resize()에서 화면 크기에 맞춰 다시 계산되는 "바닥 높이"(world 좌표).
  // 화면 아래쪽에 고정된 기준선이라고 생각하면 된다.
  let shadowFloorY = -2.6;

  // 매 프레임, 그림자들을 각자 짝지어진 구름의 X 위치로 따라가게 하고
  // (Y는 항상 바닥 높이로 고정), 작은 구름들이 화면에 보이는 동안만
  // 함께 보이도록 opacity/visible을 smallRoot와 맞춘다
  function updateCloudShadows() {
    const visible =
      smallRoot.visible;

    cloudShadowRoot.visible =
      visible;

    if (!visible) {
      return;
    }

    // smallRoot 전체가 GATHER 단계에서 서서히 투명해지는(메타볼로
    // 크로스페이드) 도중이므로, 그림자도 같은 opacity를 따라가야
    // 자연스럽다. Group 자체에는 opacity가 없고 각 메쉬의 material에만
    // 있어서, 가장 처음 만나는 메쉬 하나의 opacity 값을 대표값으로 쓴다
    let rootOpacity = 1;

    smallRoot.traverse(
      (object) => {
        if (
          object.isMesh &&
          object.material
        ) {
          rootOpacity =
            object.material
              .opacity;
        }
      },
    );

    smallClouds.forEach(
      (cloud, index) => {
        const shadow =
          cloudShadows[
            index
          ];

        shadow.position.set(
          cloud.position.x,
          shadowFloorY,
          -1,
        );

        // 구름이 바닥에서 높이 떠 있을수록(= 화면 위쪽일수록) 그림자는
        // 살짝 더 작고 옅게 만들어서 원근감을 살짝 흉내낸다
        const heightAboveFloor =
          THREE.MathUtils.clamp(
            (
              cloud.position.y -
              shadowFloorY
            ) / 4,
            0,
            1,
          );

        const falloff =
          1 -
          heightAboveFloor *
            0.35;

        shadow.material.opacity =
          0.22 *
          falloff *
          rootOpacity;

        const baseScale =
          CONFIG.baseExtent *
          cloud.userData
            .factor *
          2.6 *
          falloff;

        shadow.scale.set(
          baseScale,
          baseScale * 0.42,
          1,
        );
      },
    );
  }

  const heroCloud =
    new THREE.Group();

  const heroVisual =
    createNormalizedCloud(
      heroGltf.scene,
      CONFIG.dayColor,
    );

  heroVisual.scale.setScalar(
    CONFIG.heroExtent,
  );

  heroCloud.add(
    heroVisual,
  );

  heroCloud.visible =
    false;

  scene.add(
    heroCloud,
  );

  const metaMaterial =
    new THREE.MeshStandardMaterial({
      color:
        CONFIG.dayColor.clone(),

      roughness: 0.94,
      metalness: 0,

      transparent: true,
      opacity: 0,

      depthWrite: false,
    });

  const metaball =
    new MarchingCubes(
      CONFIG.metaResolution,
      metaMaterial,
      false,
      false,
      CONFIG.metaMaxPolygons,
    );

  metaball.isolation =
    CONFIG.metaIsolation;

  metaball.visible =
    false;

  metaball.frustumCulled =
    false;

  scene.add(
    metaball,
  );

  // baseExtent를 1/3로 줄인 만큼 메타볼 로브도 같이 줄여서
  // 작아진 구름과 합쳐졌을 때 크기가 어색하게 튀지 않도록 맞춘다
  const lobes = [
    {
      x: 0,
      y: 0,
      z: 0,
      radius: 0.12,
    },

    {
      x: -0.113,
      y: -0.007,
      z: 0.007,
      radius: 0.087,
    },

    {
      x: 0.113,
      y: -0.007,
      z: -0.003,
      radius: 0.087,
    },

    {
      x: 0.007,
      y: 0.083,
      z: 0.003,
      radius: 0.093,
    },
  ];

  let phase =
    PHASE.IDLE;

  let phaseStartedAt =
    performance.now() / 1000;

  let previousTime =
    phaseStartedAt;

  let frame = 0;
  let fieldSpan = 8;

  const fieldCenter =
    new THREE.Vector3();

  const pointerTarget =
    new THREE.Vector3();

  const pointerSmooth =
    new THREE.Vector3();

  const initialPointer =
    new THREE.Vector2();

  let hasInitialPointer =
    false;

  const mergePosition =
    new THREE.Vector3();

  const heroStart =
    new THREE.Vector3();

  const tmpA =
    new THREE.Vector3();

  const tmpB =
    new THREE.Vector3();

  const tmpColor =
    new THREE.Color();

  let textAnimations = [];
  let textRainStarted = false;

  // 스크린리더 사용자를 위한 상태 안내문(#identity-status)을 갱신하는 함수.
  // 화면에는 안 보이지만(visually-hidden) 지금 어떤 상황인지 음성으로 안내할 수 있게 해준다.
  function setStatus(
    message,
  ) {
    if (status) {
      status.textContent =
        message;
    }
  }

  // 창 크기가 바뀌거나(resize 이벤트) mount 요소의 크기가 바뀔 때마다 실행되는 함수.
  // 카메라의 보이는 범위(frustum)를 화면 비율에 맞게 다시 계산하고,
  // 렌더러 크기, 구름이 배회할 수 있는 범위, 헤더 상한선(headerLimitY)까지 함께 갱신한다.
  function resize() {
    const viewportWidth =
      Math.max(
        1,
        mount.clientWidth,
      );

    const viewportHeight =
      Math.max(
        1,
        mount.clientHeight,
      );

    const aspect =
      viewportWidth /
      viewportHeight;

    const halfHeight =
      CONFIG.frustumHeight / 2;

    const halfWidth =
      halfHeight * aspect;

    camera.left =
      -halfWidth;

    camera.right =
      halfWidth;

    camera.top =
      halfHeight;

    camera.bottom =
      -halfHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      viewportWidth,
      viewportHeight,
      false,
    );

    weatherRain.resize();

    const visibleWidth =
      camera.right -
      camera.left;

    const visibleHeight =
      camera.top -
      camera.bottom;

    const spreadWidth =
      Math.min(
        visibleWidth,
        15.5,
      );

    // 구름들이 자유롭게 배회할 수 있는 범위를 화면 크기에 맞춰 갱신.
    // 서로 안 닿고 멀리 퍼져있길 원해서 범위를 넉넉하게 넓혔다.
    roamBounds.halfWidth =
      spreadWidth * 0.62;

    roamBounds.halfHeight =
      visibleHeight * 0.58;

    // 구름 그림자를 깔아둘 "바닥 높이". 화면 아래쪽 끝(camera.bottom)에서
    // 살짝 위로 띄워서, 화면이 잘리는 맨 끝 선이 아니라 그보다 조금
    // 안쪽에 바닥이 있는 것처럼 보이게 한다
    shadowFloorY =
      camera.bottom + 0.4;

    // 실제 헤더 높이를 재서 world 좌표 상한선으로 환산.
    // 구름/hero가 이 선 위로는 절대 못 올라가게 한다.
    const headerEl =
      document.querySelector(
        '.site-header',
      );

    const headerBottomPx =
      headerEl
        ? headerEl.getBoundingClientRect()
            .bottom
        : 0;

    const pxToWorld =
      visibleHeight /
      viewportHeight;

    // 헤더에 딱 붙어 보이지 않도록 여백을 넉넉히 둔다
    headerLimitY =
      camera.top -
      Math.max(
        headerBottomPx,
        0,
      ) *
        pxToWorld -
      0.55;

    smallClouds.forEach(
      (cloud) => {
        if (
          !cloud.userData
            .roamSeeded
        ) {
          // 처음 로드될 때만 화면 곳곳에 흩어진 위치에서 시작하게 한다
          pickWanderTarget(
            cloud.userData,
            smallClouds,
          );

          cloud.position.copy(
            cloud.userData
              .roamTarget,
          );

          cloud.userData.roamSeeded =
            true;
        }
      },
    );
  }

  function pickWanderTarget(
    data,
    others,
  ) {
    // 헤더 아래쪽에서만 배회하도록 y 상한을 headerLimitY로 제한
    const maxY =
      Math.min(
        roamBounds.halfHeight,
        headerLimitY,
      );

    // 다른 구름과 너무 가까운 지점은 피하도록 몇 번 재시도한다
    // (처음에 서로 안 닿고 멀리 퍼져있길 원하는 피드백 반영)
    const minSeparation =
      Math.min(
        roamBounds.halfWidth,
        roamBounds.halfHeight,
      ) *
      0.85;

    let attempt = 0;

    let tooClose = false;

    do {
      data.roamTarget.set(
        randomBetween(
          -roamBounds.halfWidth,
          roamBounds.halfWidth,
        ),

        randomBetween(
          -roamBounds.halfHeight,
          maxY,
        ),

        randomBetween(
          -0.08,
          0.08,
        ),
      );

      tooClose =
        !!others &&
        others.some(
          (other) =>
            other.userData !==
              data &&
            other.userData
              .roamTarget
              .distanceTo(
                data.roamTarget,
              ) <
              minSeparation,
        );

      attempt += 1;
    } while (
      tooClose &&
      attempt < 10
    );

    data.roamTimer =
      randomBetween(
        5,
        10,
      );
  }

  addEventListener(
    'resize',
    resize,
    {
      passive: true,
    },
  );

  if (
    'ResizeObserver' in window
  ) {
    new ResizeObserver(
      resize,
    ).observe(
      mount,
    );
  }

  resize();

  // 마우스/터치 포인터의 화면 좌표(event.clientX/Y)를 3D 장면 안의 좌표(pointerTarget)로
  // 변환하는 함수. 화면은 픽셀 단위, 3D 장면은 카메라 기준 좌표라서 서로 계산 방식이 다르기
  // 때문에 이런 변환이 필요하다.
  function pointerToWorld(
    event,
  ) {
    const rect =
      mount.getBoundingClientRect();

    const localX =
      THREE.MathUtils.clamp(
        event.clientX -
          rect.left,
        0,
        rect.width,
      );

    const localY =
      THREE.MathUtils.clamp(
        event.clientY -
          rect.top,
        0,
        rect.height,
      );

    const ndcX =
      (
        localX /
        Math.max(
          rect.width,
          1,
        )
      ) *
        2 -
      1;

    const ndcY =
      -(
        localY /
        Math.max(
          rect.height,
          1,
        )
      ) *
        2 +
      1;

    const margin =
      mobile
        ? 0.85
        : 1.25;

    pointerTarget.set(
      THREE.MathUtils.clamp(
        ndcX * camera.right,
        camera.left + margin,
        camera.right - margin,
      ),

      THREE.MathUtils.clamp(
        ndcY * camera.top,
        camera.bottom + margin,
        camera.top - margin,
      ),

      0,
    );
  }

  // 사용자가 커서/터치를 처음 움직였을 때 IDLE(대기) 단계에서 GATHER(모임) 단계로 전환하는 함수.
  // 이 시점부터 구름들이 커서를 향해 모여들기 시작하고, 비가 조금씩 내리기 시작한다.
  function beginGather() {
    if (
      phase !== PHASE.IDLE
    ) {
      return;
    }

    phase =
      PHASE.GATHER;

    phaseStartedAt =
      performance.now() /
      1000;

    pointerSmooth.copy(
      pointerTarget,
    );

    // gather 전용 목표점을 바로 새로 뽑도록 타이머를 리셋
    smallClouds.forEach(
      (cloud) => {
        cloud.userData.roamTimer = 0;
      },
    );

    root.classList.add(
      'is-interacting',
    );

    weatherRain.setIntensity(
      CONFIG.gatherRain,
      1.1,
    );

    setStatus(
      t('statusGathering'),
    );
  }

  addEventListener(
    'pointermove',
    (event) => {
      if (
        phase !== PHASE.IDLE &&
        phase !== PHASE.GATHER
      ) {
        return;
      }

      pointerToWorld(
        event,
      );

      if (
        !hasInitialPointer
      ) {
        initialPointer.set(
          event.clientX,
          event.clientY,
        );

        hasInitialPointer =
          true;

        return;
      }

      const current =
        new THREE.Vector2(
          event.clientX,
          event.clientY,
        );

      const moved =
        initialPointer
          .distanceTo(
            current,
          );

      if (
        phase === PHASE.IDLE &&
        moved >= 8
      ) {
        beginGather();
      }
    },
    {
      passive: true,
    },
  );

  mount.addEventListener(
    'pointerdown',
    (event) => {
      if (
        phase !== PHASE.IDLE &&
        phase !== PHASE.GATHER
      ) {
        return;
      }

      pointerToWorld(
        event,
      );

      beginGather();
    },
    {
      passive: true,
    },
  );

  const skipTimer =
    setTimeout(
      () => {
        if (
          phase !== PHASE.FINAL
        ) {
          root.classList.add(
            'is-skip-visible',
          );
        }
      },
      1100,
    );

  skipButton.addEventListener(
    'click',
    finishImmediately,
  );

  root.classList.add(
    'is-ready',
  );

  setStatus(
    t('statusIdle'),
  );

  if (reducedMotion) {
    finishImmediately();
  }

  requestAnimationFrame(
    render,
  );

  // 매 화면 프레임마다(requestAnimationFrame으로) 반복 호출되는 핵심 렌더 루프.
  // 지난 프레임과의 시간 간격(delta)을 계산하고, 현재 phase(IDLE/GATHER/SETTLE 등)에 맞는
  // update 함수를 호출한 뒤, Three.js 장면을 화면에 그리고, 다음 프레임을 다시 예약한다.
  function render(
    milliseconds,
  ) {
    const now =
      milliseconds / 1000;

    const delta =
      Math.min(
        0.05,
        Math.max(
          0.001,
          now -
            previousTime,
        ),
      );

    previousTime = now;
    frame += 1;

    updateRainSource();

    // 구름 위치가 바뀔 수 있는 모든 phase 다음에 공통으로 한 번 호출.
    // 함수 안에서 smallRoot가 안 보이면 바로 return하기 때문에,
    // 매 프레임 불러도 비용이 크지 않다
    updateCloudShadows();

    weatherRain.update(
      delta,
    );

    if (
      phase === PHASE.IDLE
    ) {
      updateIdle(
        now,
        delta,
      );
    }

    if (
      phase === PHASE.GATHER
    ) {
      updateGather(
        now,
        delta,
      );
    }

    if (
      phase === PHASE.SETTLE
    ) {
      updateSettle(now);
    }

    if (
      phase ===
      PHASE.HERO_BIRTH
    ) {
      updateHeroBirth(now);
    }

    if (
      phase ===
      PHASE.HERO_CENTER
    ) {
      updateHeroCenter(now);
    }

    if (
      phase ===
      PHASE.STORM_HOLD
    ) {
      updateStormHold(now);
    }

    if (
      phase ===
      PHASE.TEXT_RAIN
    ) {
      floatHero(
        now,
        0.035,
      );
    }

    if (
      phase ===
      PHASE.CLEARING
    ) {
      updateClearing(now);
    }

    if (
      phase === PHASE.FINAL
    ) {
      updateFinalClouds(now);
    }

    renderer.render(
      scene,
      camera,
    );

    requestAnimationFrame(
      render,
    );
  }

  // 비가 하늘 전체가 아니라, 지금 화면에 있는 구름(hero 또는
  // gather 중인 구름 무리) 바로 아래에서만 내리도록 소스 위치를
  // 매 프레임 갱신한다.
  function updateRainSource() {
    let worldPos = null;

    let spreadPx =
      mobile ? 130 : 190;

    if (
      phase === PHASE.GATHER
    ) {
      worldPos = pointerSmooth;

      spreadPx =
        mobile ? 220 : 320;
    } else if (
      phase === PHASE.SETTLE ||
      phase ===
        PHASE.HERO_BIRTH ||
      phase ===
        PHASE.HERO_CENTER ||
      phase ===
        PHASE.STORM_HOLD ||
      phase ===
        PHASE.TEXT_RAIN ||
      phase === PHASE.CLEARING
    ) {
      worldPos =
        heroCloud.position;
    }

    if (!worldPos) {
      weatherRain.clearSource();

      return;
    }

    const screen =
      worldToViewport(
        worldPos,
        camera,
        renderer.domElement,
      );

    const rect =
      rainCanvas.getBoundingClientRect();

    weatherRain.setSource(
      screen.x - rect.left,
      screen.y - rect.top,
      spreadPx,
    );
  }

  function updateIdle(
    now,
    delta,
  ) {
    // 커서가 가만히 있을 때는 다섯 구름이 각자 정해진 자리 없이
    // 넓은 화면을 유유히 자유롭게 배회한다. 목표점에 거의 다다르거나
    // 시간이 다 되면 새로운 목표점을 스스로 뽑는다(느린 랜덤워크).
    smallClouds.forEach(
      (cloud) => {
        const data =
          cloud.userData;

        const seed =
          data.seed;

        data.roamTimer -=
          delta;

        if (
          data.roamTimer <=
            0 ||
          cloud.position.distanceTo(
            data.roamTarget,
          ) <
            0.2
        ) {
          pickWanderTarget(
            data,
            smallClouds,
          );
        }

        // 배회 속도는 느긋하게: gather 때보다 훨씬 천천히 움직인다
        moveTowards(
          cloud.position,
          data.roamTarget,
          data.speed *
            0.24 *
            delta,
          tmpA,
        );

        // 직선으로 딱딱하게 이동하지 않도록, 이동 방향에 수직으로
        // 살짝 휘어지는 커브(curl)를 얹어서 자연스러운 곡선 경로처럼 보이게 한다
        cloud.position.x +=
          Math.sin(
            now * 0.5 +
              seed,
          ) *
          0.01;

        cloud.position.y +=
          Math.cos(
            now * 0.42 +
              seed * 1.3,
          ) *
          0.008;

        // 헤더 위로는 절대 못 올라가게 강제로 막는다(부딪히면 그 자리에 머무름)
        if (
          cloud.position.y >
          headerLimitY
        ) {
          cloud.position.y =
            headerLimitY;
        }

        cloud.rotation.x =
          Math.sin(
            now * 0.24 +
              seed,
          ) *
          0.016;

        cloud.rotation.z =
          Math.sin(
            now * 0.2 +
              seed,
          ) *
          0.026;

        cloud.scale.setScalar(
          1 +
            Math.sin(
              now * 0.38 +
                seed,
            ) *
              0.01,
        );
      },
    );
  }

  function updateGather(
    now,
    delta,
  ) {
    const elapsed =
      now -
      phaseStartedAt;

    pointerSmooth.lerp(
      pointerTarget,
      1 -
        Math.exp(
          -7.2 * delta,
        ),
    );

    // 커서가 헤더 위에 있어도 구름들이 그쪽으로 모이려 하지 않도록,
    // 실제로 모이는 기준점 자체를 헤더 아래로 제한한다
    if (
      pointerSmooth.y >
      headerLimitY
    ) {
      pointerSmooth.y =
        headerLimitY;
    }

    const collapse =
      smoothstep(
        0.5,
        7.0,
        elapsed,
      );

    // 고정된 4칸 격자(gatherSlots) 대신, 커서 주변의 임의의 지점을
    // 계속 새로 뽑아가며 그쪽으로 몰려드는 방식. 반지름이 시간이
    // 지날수록 서서히 좁아져서 자연스럽게 커서 쪽으로 뭉친다.
    const roamRadius =
      THREE.MathUtils.lerp(
        3.2,
        0.16,
        collapse,
      );

    smallClouds.forEach(
      (cloud) => {
        const data =
          cloud.userData;

        const seed =
          data.seed;

        data.roamTimer -=
          delta;

        const closeEnough =
          cloud.position.distanceTo(
            data.roamTarget,
          ) <
          roamRadius * 0.55;

        if (
          data.roamTimer <=
            0 ||
          closeEnough
        ) {
          const angle =
            Math.random() *
            Math.PI *
            2;

          const r =
            roamRadius *
            (
              0.35 +
              Math.random() *
                0.65
            );

          data.roamTarget.set(
            pointerSmooth.x +
              Math.cos(
                angle,
              ) *
                r,

            Math.min(
              pointerSmooth.y +
                Math.sin(
                  angle,
                ) *
                  r,
              headerLimitY,
            ),

            randomBetween(
              -0.04,
              0.04,
            ),
          );

          data.roamTimer =
            randomBetween(
              0.45,
              1.05,
            ) *
            (
              1 -
              collapse * 0.55
            );
        }

        moveTowards(
          cloud.position,
          data.roamTarget,
          data.speed *
            delta,
          tmpB,
        );

        // 헤더 위로는 절대 못 올라가게 강제 clamp
        if (
          cloud.position.y >
          headerLimitY
        ) {
          cloud.position.y =
            headerLimitY;
        }

        cloud.rotation.z =
          Math.sin(
            now * 0.48 +
              seed,
          ) *
          0.025 *
          (
            1 -
            collapse
          );
      },
    );

    const metrics =
      calculateMetrics(
        smallClouds,
      );

    // 메타볼(합쳐진 덩어리)이 구름들이 아직 많이 떨어져있을 때부터
    // 미리 나타나면 "화면 중앙에 정체불명의 물체가 갑자기 생기는" 것처럼
    // 보인다. 실제 합체 조건(spread < 0.72)에 훨씬 가까워졌을 때만
    // 메타볼이 나타나도록 임계값을 크게 좁힌다.
    // 서서히 녹아드는 느낌(dissolve) 대신, 실제로 표면이 맞닿는
    // 순간에 훨씬 짧고 스냅있게 전환되도록 범위를 더 좁혔다
    const blend =
      THREE.MathUtils.clamp(
        (
          1 -
          smoothstep(
            0.4,
            mobile
              ? 0.95
              : 1.05,
            metrics.spread,
          )
        ) *
          smoothstep(
            1.0,
            1.8,
            elapsed,
          ),
        0,
        1,
      );

    setObjectOpacity(
      smallRoot,
      1 - blend,
    );

    metaball.visible =
      blend > 0.005;

    metaMaterial.opacity =
      blend;

    metaMaterial.depthWrite =
      blend > 0.98;

    if (metaball.visible) {
      updateMetaballs(
        now,
        metrics,
        0,
      );
    }

    const allNear =
      smallClouds.every(
        (cloud) =>
          cloud.position.distanceTo(
            pointerSmooth,
          ) <
          (
            mobile
              ? 0.74
              : 0.66
          ),
      );

    // 예전에는 spread < 0.72에서 바로 SETTLE로 넘어갔는데, 그 시점엔
    // blend(메타볼 크로스페이드)가 아직 0.4~0.6 정도라서 원본 구름
    // 낱개 모양이 46% 안팅 남아있는 채로 갑자기 "완전히 안 보이는
    // smallRoot + 완전히 불투명한 metaball"로 순간이동(pop)했다.
    // 그 남은 잔상이 "작은 덩어리가 아직도 생긴다"로 보인 원인이라,
    // blend가 이미 (거의) 1에 도달해서 원본 구름이 눈에 안 보이게 된
    // 뒤에야 SETTLE로 넘어가도록 임계값을 blend의 완전 불투명 지점(0.4)
    // 바로 위로 좁혀서 전환이 끊김 없이 이어지게 한다
    // spread 임계값을 0.44 → 0.5로 살짝 완화했다. 예전 0.44는
    // 구름이 거의 완벽하게 겹쳐야만 합체를 시작해서, 실제로는
    // minGatherTime을 넘기고도 이 조건을 못 채워 forceMergeTime까지
    // 계속 기다리는 경우가 잦았다(=체감상 "합쳐지는 게 너무 오래
    // 걸림"). blend가 이 시점에 이미 0.93 이상으로 거의 다 녹아든
    // 상태라 아래 beginSettle의 즉시 전환(opacity 스냅)도 거의
    // 티가 안 나면서, 조금 더 일찍 합체가 시작되게 완화한다
    const shouldMerge =
      (
        elapsed >=
          CONFIG.minGatherTime &&
        allNear &&
        metrics.spread < 0.5
      ) ||
      elapsed >=
        CONFIG.forceMergeTime;

    if (shouldMerge) {
      beginSettle(
        metrics.centroid,
        now,
      );
    }
  }

  // GATHER(모임) 단계가 끝나고 구름 5개가 하나의 메타볼 덩어리로 "정착"하는 SETTLE 단계를
  // 시작하는 함수. 원래 낱개 구름(smallRoot)은 숨기고, 합쳐진 메타볼(metaball)을 보이게 한다.
  function beginSettle(
    centroid,
    now,
  ) {
    phase =
      PHASE.SETTLE;

    phaseStartedAt = now;

    mergePosition.copy(
      centroid,
    );

    // 방어적으로 한 번 더 clamp (헤더를 넘는 지점에서 합쳐지지 않도록)
    if (
      mergePosition.y >
      headerLimitY
    ) {
      mergePosition.y =
        headerLimitY;
    }

    root.classList.remove(
      'is-interacting',
    );

    root.classList.add(
      'is-cinematic',
    );

    setObjectOpacity(
      smallRoot,
      0,
    );

    smallRoot.visible =
      false;

    metaball.visible =
      true;

    metaMaterial.opacity =
      1;

    metaMaterial.depthWrite =
      true;

    weatherRain.setIntensity(
      0.62,
      0.5,
    );

    setStatus(
      t('statusSettled'),
    );
  }

  function updateSettle(
    now,
  ) {
    const raw =
      clamp01(
        (
          now -
          phaseStartedAt
        ) /
          CONFIG.settleDuration,
      );

    // 젤리처럼 "부풀었다 정착하는" 느낌만 주고, 축소(작아짐)는
    // 절대 일어나지 않도록 음수 구간을 0으로 클램프한다.
    // 주파수를 1배로 낮춰서 봉우리가 한 번만 생기게 한 뒤에도, 진폭이
    // 0.24(24%)나 되다 보니 "부풀었다가 다시 원래 크기로 줄어드는"
    // 움직임 자체가 여전히 눈에 띄게 "작아졌다 다시 생기는" 것처럼
    // 보였다. 진폭을 0.08로 확 줄여서 살짝 탱글거리는 정도로만
    // 남기고, 크게 부풀었다 꺼지는 느낌 자체를 없앤다
    const wobble =
      Math.max(
        0,
        Math.sin(
          raw *
            Math.PI,
        ),
      ) *
      Math.pow(
        1 - raw,
        1.4,
      ) *
      0.08;

    // 예전 값(±0.6 안팎)은 구름이 아직 크던 시절 기준이라, 지금처럼
    // 작아진 구름에서는 5개가 다시 갈라진 조각처럼 보이는 원인이었다.
    // 로브 자체의 퍼짐(±0.11 안팎)과 비슷한 수준으로 훨씬 좁혀서
    // 하나의 뭉친 덩어리로 보이게 한다.
    // 이전(±0.08 안팎)보다도 한 번 더 좁혀서, 로브 반지름(0.087~0.12)
    // 대비 클러스터 간격이 확실히 작아지도록 한다. 이러면 어떤 프레임에도
    // 한 조각만 살짝 떨어져 보이는 일이 생기지 않는다
    const pattern = [
      [
        -0.045,
        0.011,
        0.011,
      ],

      [
        0.045,
        0.011,
        -0.011,
      ],

      [
        -0.028,
        -0.022,
        0.017,
      ],

      [
        0.028,
        -0.022,
        -0.017,
      ],

      [
        0,
        0.028,
        0.028,
      ],
    ];

    smallClouds.forEach(
      (cloud, index) => {
        const [
          x,
          y,
          z,
        ] = pattern[index];

        // 예전에는 raw(0→1)가 진행될수록 패턴 간격을 (1 - raw*0.28)만큼
        // 계속 좁혀서, 하나로 뭉친 뒤에도 눈에 띄게 더 작아지는 것처럼
        // 보이는 원인이 되었다. 간격을 시간에 따라 좁히지 않고 고정값으로
        // 둬서, 뭉친 이후 추가로 축소되는 느낌이 없도록 한다.
        tmpA.set(
          mergePosition.x +
            x,

          mergePosition.y +
            y,

          z,
        );

        cloud.position.lerp(
          tmpA,
          0.22,
        );
      },
    );

    updateMetaballs(
      now,
      calculateMetrics(
        smallClouds,
      ),
      wobble,
    );

    if (raw >= 1) {
      beginHeroBirth(now);
    }
  }

  // SETTLE(정착) 단계가 끝난 뒤, 합쳐진 메타볼 덩어리가 진짜 "hero 구름"(먹구름) 모델로
  // 바뀌는 HERO_BIRTH 단계를 시작하는 함수.
  function beginHeroBirth(
    now,
  ) {
    phase =
      PHASE.HERO_BIRTH;

    phaseStartedAt = now;

    heroCloud.visible =
      true;

    heroCloud.position.copy(
      mergePosition,
    );

    // hero는 "작았다가 커지는" 느낌 없이 처음부터 최종 크기(1.0)로
    // 태어나고, 살짝의 탱글한 wobble만으로 등장한다
    heroCloud.scale.setScalar(
      1,
    );

    setObjectColor(
      heroCloud,
      CONFIG.dayColor,
    );

    // 메타볼(5개가 뭉친 덩어리)과 hero 3D 모델은 실루엣이 완전히
    // 똑같지 않다. 예전처럼 둘을 opacity로 서서히 크로스페이드하면,
    // 메타볼 쪽 로브가 hero 모델의 윤곽보다 살짝 더 삐져나온 부분이
    // 옅어지는 채로 잠깐 남아 "작은 덩어리가 아직도 생긴다"는
    // 잔상으로 보였다. 크로스페이드 없이 같은 위치에서 한 프레임 만에
    // 완전히 바꿔치기해서 그 잔상 자체가 생길 시간을 없앤다
    metaball.visible =
      false;

    setObjectOpacity(
      heroCloud,
      1,
    );
  }

  function updateHeroBirth(
    now,
  ) {
    const raw =
      clamp01(
        (
          now -
          phaseStartedAt
        ) /
          CONFIG.heroBirthDuration,
      );

    // 예전에는 여기서도 살짝 부풀었다가(scale 1.06) 다시 1.0으로
    // 가라앉는 wobble을 줬는데, 아무리 작은 폭이어도 "부풀었다 다시
    // 가라앉는" 왕복 움직임 자체가 "작아졌다 다시 생기는" 것처럼
    // 읽혔다. hero가 태어나는 이 구간에서는 아예 크기를 흔들지 않고
    // scale 1.0으로 고정해서, 크기 변화가 전혀 없다는 걸 눈으로
    // 바로 확인할 수 있게 한다 (탱글한 느낌은 이미 SETTLE 단계에서
    // 충분히 표현되고 있다)
    heroCloud.scale.setScalar(
      1,
    );

    if (raw >= 1) {
      heroStart.copy(
        heroCloud.position,
      );

      phase =
        PHASE.HERO_CENTER;

      phaseStartedAt = now;

      root.classList.add(
        'is-storm',
      );

      weatherRain.setIntensity(
        CONFIG.stormRain,
        1.3,
      );
    }
  }

  // HERO_CENTER 단계 동안 매 프레임 실행되는 함수. 갓 태어난 hero 구름을 화면 중앙의
  // 목표 위치(getHeroTarget)로 서서히 이동시키고, 그 다음 STORM_HOLD 단계로 넘어갈 준비를 한다.
  function updateHeroCenter(
    now,
  ) {
    const raw =
      clamp01(
        (
          now -
          phaseStartedAt
        ) /
          CONFIG.heroCenterDuration,
      );

    const progress =
      easeInOutCubic(raw);

    const target =
      getHeroTarget();

    heroCloud.position
      .lerpVectors(
        heroStart,
        target,
        progress,
      );

    heroCloud.scale.setScalar(
      1 +
        progress * 0.16 +
        Math.sin(
          raw * Math.PI,
        ) *
          0.018,
    );

    tmpColor
      .copy(
        CONFIG.dayColor,
      )
      .lerp(
        CONFIG.stormColor,
        progress,
      );

    setObjectColor(
      heroCloud,
      tmpColor,
    );

    if (raw >= 1) {
      heroCloud.position.copy(
        target,
      );

      heroCloud.scale.setScalar(
        1.16,
      );

      setObjectColor(
        heroCloud,
        CONFIG.stormColor,
      );

      phase =
        PHASE.STORM_HOLD;

      phaseStartedAt = now;
    }
  }

  // STORM_HOLD(먹구름이 잠시 머무르는) 단계 동안 매 프레임 실행되는 함수.
  // hero 구름을 살짝 둥실거리게(floatHero)만 하다가, 정해진 시간이 지나면 TEXT_RAIN 단계로 넘어간다.
  function updateStormHold(
    now,
  ) {
    floatHero(
      now,
      0.025,
    );

    if (
      now -
        phaseStartedAt >=
      CONFIG.stormHoldDuration
    ) {
      beginTextRain(now);
    }
  }

  // TEXT_RAIN(본문 글자가 비처럼 떨어지는) 단계를 시작하는 함수.
  // 한 번만 실행되도록 textRainStarted 플래그로 중복 실행을 막는다.
  function beginTextRain(
    now,
  ) {
    if (textRainStarted) {
      return;
    }

    textRainStarted =
      true;

    phase =
      PHASE.TEXT_RAIN;

    phaseStartedAt = now;

    weatherRain.setIntensity(
      CONFIG.textRain,
      0.75,
    );

    setStatus(
      t('statusTextRain'),
    );

    animateTextRain(
      rainTargets,
      textRainLayer,
      heroCloud,
      camera,
      renderer,
      mobile,
      (animation) => {
        textAnimations.push(
          animation,
        );
      },
    ).then(() => {
      if (
        phase ===
        PHASE.TEXT_RAIN
      ) {
        beginClearing(
          performance.now() /
            1000,
        );
      }
    });
  }

  // 먹구름/비가 걷히고 해가 뜨기 시작하는 CLEARING 단계를 시작하는 함수.
  function beginClearing(
    now,
  ) {
    phase =
      PHASE.CLEARING;

    phaseStartedAt = now;

    root.classList.add(
      'is-clearing',
    );

    weatherRain.setIntensity(
      0,
      CONFIG.clearingDuration *
        0.7,
    );

    // 인터랙티브 3D 구름은 인트로가 끝나면 배경 장식으로 재활용하지 않고
    // 그대로 사라진 채로 둔다. 최종 장면은 해/무지개/타이틀만 깔끔하게 남긴다.
    smallRoot.visible =
      false;
  }

  // CLEARING 단계 동안 매 프레임 실행되는 함수. 하늘 색이 먹구름에서 맑음으로 서서히
  // 바뀌고, 비/hero 구름이 옅어지다가 끝나면 enterFinal()로 넘어간다.
  function updateClearing(
    now,
  ) {
    const raw =
      clamp01(
        (
          now -
          phaseStartedAt
        ) /
          CONFIG.clearingDuration,
      );

    const progress =
      easeInOutCubic(raw);

    setObjectOpacity(
      heroCloud,
      1 - progress,
    );

    heroCloud.position.y +=
      0.0027;

    heroCloud.scale.setScalar(
      1.16 +
        progress * 0.08,
    );

    if (raw >= 1) {
      heroCloud.visible =
        false;

      enterFinal();
    }
  }

  // 연출의 마지막 단계(FINAL)로 진입하는 함수. 해/무지개/타이틀/본문이 모두 드러난
  // 최종 화면 상태로 전환하고, 떨어졌던 글자들을 전부 제자리로 돌려놓는다(revealAllWords).
  function enterFinal() {
    phase =
      PHASE.FINAL;

    // has-landed 클래스는 is-final과 정확히 같은 시점(같은 tick)에
    // 붙인다. 타이틀(.identity-title-cluster)도 is-final이 붙는 순간
    // 자기 CSS transition-delay(0.3s)를 세면서 나타나므로, 본문 글자도
    // 똑같이 0.3s만큼 늦게 시작하도록 CSS 쪽(.rain-word-target.has-landed)에
    // transition-delay를 맞춰뒀다 — JS에서 따로 setTimeout으로 시작
    // 시점을 어긋나게 만들지 않고, 둘 다 같은 순간에 타이머가 시작되게
    // 해야 진짜로 "같이" 나타나는 것처럼 보인다.
    revealAllWords(
      rainTargets,
    );

    root.classList.add(
      'is-final',
    );

    root.classList.remove(
      'is-storm',
      'is-skip-visible',
    );

    document.body.classList.remove(
      'identity-intro-active',
    );

    clearTimeout(
      skipTimer,
    );

    setStatus(
      t('statusFinal'),
    );
  }

  // FINAL 단계에서 매 프레임 실행되는 함수. 3D 구름은 이제 배경 장식으로 쓰지 않으므로,
  // 여기서는 남은 잔여 애니메이션(살짝 흔들림 등) 정도만 처리한다.
  function updateFinalClouds(
    now,
  ) {
    smallClouds.forEach(
      (cloud) => {
        const seed =
          cloud.userData.seed;

        cloud.position.y +=
          Math.sin(
            now * 0.18 +
              seed,
          ) *
          0.00055;

        cloud.rotation.z =
          Math.sin(
            now * 0.14 +
              seed,
          ) *
          0.012;
      },
    );
  }

  // "SKIP" 버튼을 누르거나, 사용자가 애니메이션 최소화 설정(prefers-reduced-motion)을 켜둔 경우
  // 실행되는 함수. 중간 단계들을 다 건너뛰고 곧바로 최종(FINAL) 상태로 만든다.
  function finishImmediately() {
    if (
      phase === PHASE.FINAL
    ) {
      return;
    }

    textAnimations.forEach(
      (animation) => {
        try {
          animation.cancel();
        } catch {
          /* 이미 종료됨 */
        }
      },
    );

    textAnimations = [];

    textRainLayer.replaceChildren();

    metaball.visible =
      false;

    heroCloud.visible =
      false;

    smallRoot.visible =
      false;

    weatherRain.setIntensityInstantly(
      0,
    );

    revealAllWords(
      rainTargets,
    );

    root.classList.add(
      'is-clearing',
      'is-final',
    );

    root.classList.remove(
      'is-storm',
      'is-interacting',
      'is-cinematic',
      'is-skip-visible',
    );

    document.body.classList.remove(
      'identity-intro-active',
    );

    clearTimeout(
      skipTimer,
    );

    phase =
      PHASE.FINAL;
  }

  function updateMetaballs(
    now,
    metrics,
    wobble,
  ) {
    // 구름 크기를 1/3로 줄인 만큼, 메타볼이 렌더링되는 격자(fieldSpan)도
    // 같은 비율로 줄여야 격자 해상도 대비 로브가 너무 작아져
    // (마칭큐브가 형태를 못 그려서) 안 보이거나 뭉개지는 걸 막을 수 있다
    const desiredSpan =
      THREE.MathUtils.clamp(
        Math.max(
          metrics.rangeX,
          metrics.rangeY,
        ) +
          (
            mobile
              ? 1.2
              : 1.35
          ),

        mobile
          ? 1.7
          : 1.9,

        mobile
          ? 2.7
          : 3.3,
      );

    fieldSpan =
      THREE.MathUtils.lerp(
        fieldSpan,
        desiredSpan,
        0.14,
      );

    fieldCenter.lerp(
      metrics.centroid,
      0.18,
    );

    metaball.position.copy(
      fieldCenter,
    );

    metaball.scale.setScalar(
      fieldSpan / 2,
    );

    metaball.reset();

    smallClouds.forEach(
      (cloud) => {
        const factor =
          cloud.userData.factor;

        const seed =
          cloud.userData.seed;

        lobes.forEach(
          (lobe, index) => {
            const pulse =
              1 +
              Math.sin(
                now * 2.4 +
                  seed +
                  index,
              ) *
                0.018 +
              wobble;

            const worldX =
              cloud.position.x +
              lobe.x *
                factor *
                pulse;

            const worldY =
              cloud.position.y +
              lobe.y *
                factor *
                pulse;

            const worldZ =
              cloud.position.z +
              lobe.z *
                factor;

            const fieldX =
              (
                worldX -
                fieldCenter.x
              ) /
                fieldSpan +
              0.5;

            const fieldY =
              (
                worldY -
                fieldCenter.y
              ) /
                fieldSpan +
              0.5;

            const fieldZ =
              (
                worldZ -
                fieldCenter.z
              ) /
                fieldSpan +
              0.5;

            if (
              fieldX <= 0.02 ||
              fieldX >= 0.98 ||
              fieldY <= 0.02 ||
              fieldY >= 0.98 ||
              fieldZ <= 0.02 ||
              fieldZ >= 0.98
            ) {
              return;
            }

            const radius =
              (
                lobe.radius *
                factor *
                pulse
              ) /
              fieldSpan;

            const strength =
              (
                CONFIG.metaIsolation +
                CONFIG.metaSubtract
              ) *
              radius *
              radius;

            metaball.addBall(
              fieldX,
              fieldY,
              fieldZ,
              strength,
              CONFIG.metaSubtract,
              CONFIG.dayColor,
            );
          },
        );
      },
    );

    if (
      !mobile ||
      frame % 2 === 0
    ) {
      metaball.update();
    }
  }

  function getHeroTarget() {
    // hero 구름의 반지름 + 살짝의 둥실거림(floatHero) 여유분을 빼서
    // 실제 구름 표면이 헤더에 절대 닿지 않도록 한다
    return tmpB.set(
      0,
      Math.min(
        camera.top * 0.4,
        headerLimitY - 0.36,
      ),
      0,
    );
  }

  // hero 구름이 완전히 멈춰있지 않고 사인(sin) 곡선을 따라 위아래로 살짝 둥실거리게 만드는 함수.
  // amount는 둥실거리는 폭(진폭)을 정한다.
  function floatHero(
    now,
    amount,
  ) {
    heroCloud.position.y =
      getHeroTarget().y +
      Math.sin(
        now * 0.72,
      ) *
        amount;

    heroCloud.rotation.z =
      Math.sin(
        now * 0.36,
      ) *
      0.008;
  }
}

function prepareRainTargets(
  body,
) {
  // 단어가 아니라 한 글자(문자) 단위로 span을 만든다.
  // 같은 단어 안의 글자들은 사이에 공백 텍스트노드를 넣지 않아서
  // 붙어있는 한 단어처럼 줄바꿈되고, 단어와 단어 사이에만
  // 공백 텍스트노드를 넣어 자연스럽게 줄바꿈이 일어난다.
  //
  // 예전엔 paragraph.textContent로 문단 전체를 "순수 글자"로만
  // 뽑아냈는데, textContent는 <br> 같은 태그를 완전히 무시하고
  // 글자만 이어붙이기 때문에, 문단 안에 <br>을 넣어도 사라져버리고
  // 줄바꿈이 전혀 반영되지 않았다(HTML 태그를 직접 손으로 넣어도
  // "안 바뀌는" 원인이었다). 이제는 paragraph.childNodes를 하나씩
  // 순회하면서, 글자(텍스트 노드)는 예전처럼 글자별 span으로 쪼개고,
  // <br> 태그를 만나면 그 자리에 진짜 <br> 요소를 그대로 다시
  // 만들어 끼워 넣어서 줄바꿈 위치를 그대로 보존한다.
  const targets = [];

  body
    .querySelectorAll(
      '[data-rain-text]',
    )
    .forEach(
      (paragraph) => {
        const originalNodes =
          Array.from(
            paragraph.childNodes,
          );

        paragraph.replaceChildren();

        originalNodes.forEach(
          (node) => {
            // <br> 태그는 글자로 쪼개지 않고, 그대로 새 <br>을
            // 만들어 같은 자리에 다시 넣어서 줄바꿈을 유지한다
            if (
              node.nodeType ===
                Node.ELEMENT_NODE &&
              node.tagName === 'BR'
            ) {
              paragraph.append(
                document.createElement(
                  'br',
                ),
              );
              return;
            }

            // <br> 이외의 태그(혹시 모를 예외 상황)나 빈 텍스트
            // 노드는 무시한다 — 이 문단들은 원래 순수 텍스트 +
            // <br>만 들어있는 것을 전제로 한다
            if (
              node.nodeType !==
              Node.TEXT_NODE
            ) {
              return;
            }

            const words =
              node.textContent
                .trim()
                .split(/\s+/)
                .filter(Boolean);

            words.forEach(
              (word, wordIndex) => {
                const chars =
                  Array.from(
                    word,
                  );

                chars.forEach(
                  (char) => {
                    const span =
                      document.createElement(
                        'span',
                      );

                    span.className =
                      'rain-word-target';

                    span.textContent =
                      char;

                    paragraph.append(
                      span,
                    );

                    targets.push(
                      span,
                    );
                  },
                );

                if (
                  wordIndex <
                  words.length - 1
                ) {
                  paragraph.append(
                    document.createTextNode(
                      ' ',
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );

  return targets;
}

// 본문 글자들이 하나씩 hero 구름 위치에서 비처럼 떨어져 바닥에 튕긴 뒤 사라지는
// 연출 전체를 순서대로 실행하는 함수. await/setTimeout으로 글자 하나하나의 낙하 타이밍을
// 조절하기 때문에 async 함수로 되어 있다.
async function animateTextRain(
  targets,
  layer,
  heroCloud,
  camera,
  renderer,
  mobile,
  register,
) {
  await nextPaint();

  const start =
    worldToViewport(
      heroCloud.position,
      camera,
      renderer.domElement,
    );

  const stageRect =
    renderer.domElement.getBoundingClientRect();

  // 글자들이 떨어져 튕기는 "바닥" 위치
  const floorY =
    stageRect.bottom - 26;

  const floorSpread =
    Math.min(
      stageRect.width * 0.42,
      480,
    );

  // 이제 targets는 단어가 아니라 글자 단위라서 개수가 훨씬 많다.
  // 모바일에서 전부 애니메이션하면 너무 오래 걸리므로 상한을 올려서 잡되,
  // 데스크톱과 비슷한 인상을 주도록 넉넉하게 잡는다.
  const activeCount =
    mobile
      ? Math.min(
          targets.length,
          260,
        )
      : targets.length;

  const activeTargets =
    targets.slice(
      0,
      activeCount,
    );

  // ============================================
  // 폭포처럼 쏟아지는 게 아니라, 빗방울처럼 천천히 하나씩 떨어지도록
  // 낙하 시작 시각을 훨씬 넓은 시간대에 듬성듬성 흩뿌리고, 개별 낙하
  // 속도도 크게 늦춘다. 글자마다 완전히 무작위 시각에 떨어지기
  // 시작하고, 바닥에 닿으면 살짝 튕긴 뒤 그 자리에서 페이드아웃되어
  // 사라진다 — 본문 글자 위치로 날아가 "쌓이는" 동작은 하지 않는다
  // (연출과 본문 등장은 완전히 분리된다).
  // ============================================
  const fallWindow =
    mobile ? 2200 : 3000;

  const items =
    activeTargets.map(
      (target) => {
        const fallDelay =
          randomBetween(
            0,
            fallWindow,
          );

        // 예전보다 훨씬 느리게 떨어지도록 낙하 소요 시간을 두 배 가까이
        // 늘려서, 폭포처럼 쏟아지지 않고 빗방울처럼 여유 있게 내려온다
        const fallDuration =
          randomBetween(
            mobile
              ? 1300
              : 1600,

            mobile
              ? 2100
              : 2600,
          );

        const bounceDuration =
          randomBetween(
            200,
            360,
          );

        const settleFadeDuration =
          randomBetween(
            300,
            480,
          );

        return {
          target,

          floorX:
            start.x +
            randomBetween(
              -floorSpread,
              floorSpread,
            ),

          startX:
            start.x +
            randomBetween(
              -90,
              90,
            ),

          startY:
            start.y -
            randomBetween(
              20,
              90,
            ),

          // 빗방울은 종이/색종이처럼 빙글빙글 돌지 않으므로 회전 폭을
          // 크게 줄이고, 크기 편차도 줄여서 폭포의 물보라처럼 튀지
          // 않고 결이 고른 빗방울처럼 보이게 한다
          rotation:
            randomBetween(
              -6,
              6,
            ),

          startScale:
            randomBetween(
              1,
              1.15,
            ),

          bounceHeight:
            randomBetween(
              16,
              40,
            ),

          fallDelay,
          fallDuration,
          bounceDuration,
          settleFadeDuration,
        };
      },
    );

  const promises = [];

  let maxFinishTime = 0;

  items.forEach(
    (item) => {
      const clone =
        document.createElement(
          'span',
        );

      clone.className =
        'falling-word';

      clone.textContent =
        item.target.textContent;

      layer.append(
        clone,
      );

      const totalDuration =
        item.fallDuration +
        item.bounceDuration +
        item.settleFadeDuration;

      const landOffset =
        item.fallDuration /
        totalDuration;

      const bounceOffset =
        (
          item.fallDuration +
          item.bounceDuration
        ) / totalDuration;

      const floorTransform = `translate3d(${item.floorX}px, ${floorY}px, 0) rotate(0deg) scale(0.92)`;

      const bounceTransform = `translate3d(${item.floorX}px, ${floorY - item.bounceHeight}px, 0) rotate(0deg) scale(1.02)`;

      const animation =
        clone.animate(
          [
            {
              offset: 0,

              transform:
                `translate3d(${item.startX}px, ${item.startY}px, 0) rotate(${item.rotation}deg) scale(${item.startScale})`,

              opacity: 0,

              filter:
                'blur(3px)',

              // 예전의 급격한 가속 곡선(폭포처럼 순식간에 확 떨어지는
              // 느낌)을 훨씬 부드러운 가속으로 바꿔서, 빗방울이
              // 여유 있게 내려오는 속도감을 준다
              easing:
                'ease-in',
            },

            {
              offset:
                landOffset,

              transform:
                floorTransform,

              opacity: 0.95,

              filter:
                'blur(0)',

              easing:
                'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },

            {
              offset:
                bounceOffset,

              transform:
                bounceTransform,

              opacity: 0.75,

              filter:
                'blur(0)',

              easing:
                'cubic-bezier(0.4, 0, 0.6, 1)',
            },

            {
              offset: 1,

              transform:
                floorTransform,

              opacity: 0,

              filter:
                'blur(2px)',
            },
          ],
          {
            duration:
              totalDuration,

            delay:
              item.fallDelay,

            fill: 'both',
          },
        );

      register(
        animation,
      );

      const finishTime =
        item.fallDelay +
        totalDuration;

      if (
        finishTime >
        maxFinishTime
      ) {
        maxFinishTime =
          finishTime;
      }

      promises.push(
        animation.finished
          .catch(
            () => {},
          )
          .then(
            () => {
              clone.remove();
            },
          ),
      );
    },
  );

  // 낙하하는 글자가 하나도 없는 극단적인 경우를 대비한 안전값
  if (maxFinishTime === 0) {
    maxFinishTime =
      mobile ? 900 : 1300;
  }

  // ============================================
  // 예전엔 여기서 본문 글자를 비가 바닥에 튕겨 사라질 즈음 미리
  // has-landed 처리해서 보여줬는데, 그러면 아직 TEXT_RAIN 단계라
  // 해가 뜨기(CLEARING→FINAL) 한참 전에 본문이 다 드러나버렸다.
  // 이제 본문 공개는 여기서 하지 않고, enterFinal()의 revealAllWords
  // 호출 하나로만 처리한다 — 그래야 타이틀/해와 정확히 같은 시점부터
  // 나타난다. 낙하 애니메이션(글자가 떨어져 튕기고 사라지는 연출)만
  // 여기서 계속 재생하고, 실제 본문 글자는 계속 숨겨진 채로 둔다.
  // ============================================

  createDecorativeDrops(
    layer,
    targets,
    start,
    mobile,
    register,
  );

  await Promise.all(
    promises,
  );

  await wait(450);
}

// 실제 글자와는 별개로, 화면을 더 풍성하게 채우기 위한 "장식용" 빗방울 요소들을
// text-rain-layer 안에 추가로 만들어내는 함수.
function createDecorativeDrops(
  layer,
  targets,
  start,
  mobile,
  register,
) {
  const count =
    mobile ? 18 : 34;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const source =
      targets[
        Math.floor(
          Math.random() *
            targets.length,
        )
      ];

    if (!source) {
      continue;
    }

    const clone =
      document.createElement(
        'span',
      );

    clone.className =
      'falling-word is-decorative';

    clone.textContent =
      source.textContent;

    layer.append(
      clone,
    );

    const startX =
      start.x +
      randomBetween(
        -170,
        170,
      );

    const startY =
      start.y +
      randomBetween(
        22,
        70,
      );

    const endX =
      startX +
      randomBetween(
        -190,
        190,
      );

    const endY =
      innerHeight +
      randomBetween(
        80,
        260,
      );

    const animation =
      clone.animate(
        [
          {
            transform:
              `translate3d(${startX}px, ${startY}px, 0)`,

            opacity: 0,
          },

          {
            offset: 0.12,

            opacity:
              randomBetween(
                0.35,
                0.72,
              ),
          },

          {
            transform:
              `translate3d(${endX}px, ${endY}px, 0)`,

            opacity: 0,
          },
        ],
        {
          duration:
            randomBetween(
              2400,
              4200,
            ),

          delay:
            randomBetween(
              0,
              1600,
            ),

          easing:
            'cubic-bezier(0.2, 0.55, 0.35, 1)',

          fill: 'both',
        },
      );

    register(
      animation,
    );

    animation.finished
      .catch(() => {})
      .finally(() => {
        clone.remove();
      });
  }
}

// 비처럼 떨어졌던 글자 요소들에 "has-landed" 클래스를 붙여서, 제자리(원래 문장 위치)로
// 돌아온 것처럼 보이게 하는 함수. SKIP 버튼을 눌러 건너뛸 때도 이 함수로 즉시 마무리한다.
function revealAllWords(
  targets,
) {
  targets.forEach(
    (target) => {
      target.classList.add(
        'has-landed',
      );
    },
  );
}

// 2D canvas(weather-rain-canvas) 위에 빗방울들을 직접 그려서 비 내리는 효과를 만드는 클래스.
// "class"는 관련된 데이터(빗방울 목록 등)와 동작(그리기, 세기 조절 등)을 하나로
// 묶어두는 문법이다. new WeatherRain(...)으로 인스턴스를 하나 만들어 계속 재사용한다.
class WeatherRain {
  constructor(
    canvas,
    mobile,
    initialIntensity,
  ) {
    const context =
      canvas.getContext(
        '2d',
      );

    if (!context) {
      throw new Error(
        '비 Canvas를 만들 수 없습니다.',
      );
    }

    this.canvas =
      canvas;

    this.context =
      context;

    this.mobile =
      mobile;

    this.width = 1;
    this.height = 1;
    this.dpr = 1;

    this.drops = [];

    this.intensity =
      initialIntensity;

    this.targetIntensity =
      initialIntensity;

    this.transitionSpeed =
      1;

    // 비가 하늘 전체가 아니라 특정 지점(구름) 아래에서만 내리도록
    // 하는 소스 위치. null이면 예전처럼 화면 전체에서 내린다.
    this.sourceX = null;
    this.sourceY = null;
    this.sourceSpread = 260;
  }

  setSource(
    x,
    y,
    spread,
  ) {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceSpread = spread;
  }

  clearSource() {
    this.sourceX = null;
    this.sourceY = null;
  }

  resize() {
    const rect =
      this.canvas
        .getBoundingClientRect();

    this.width =
      Math.max(
        1,
        rect.width,
      );

    this.height =
      Math.max(
        1,
        rect.height,
      );

    this.dpr =
      Math.min(
        devicePixelRatio || 1,
        this.mobile
          ? 1.2
          : 1.5,
      );

    this.canvas.width =
      Math.round(
        this.width *
          this.dpr,
      );

    this.canvas.height =
      Math.round(
        this.height *
          this.dpr,
      );

    this.context.setTransform(
      this.dpr,
      0,
      0,
      this.dpr,
      0,
      0,
    );
  }

  setIntensity(
    value,
    duration = 1,
  ) {
    this.targetIntensity =
      THREE.MathUtils.clamp(
        value,
        0,
        1,
      );

    this.transitionSpeed =
      duration <= 0
        ? 1000
        : 1 / duration;
  }

  setIntensityInstantly(
    value,
  ) {
    this.intensity =
      THREE.MathUtils.clamp(
        value,
        0,
        1,
      );

    this.targetIntensity =
      this.intensity;

    this.drops.length = 0;

    this.context.clearRect(
      0,
      0,
      this.width,
      this.height,
    );
  }

  update(
    delta,
  ) {
    const step =
      THREE.MathUtils.clamp(
        this.transitionSpeed *
          delta,
        0,
        1,
      );

    this.intensity =
      THREE.MathUtils.lerp(
        this.intensity,
        this.targetIntensity,
        step,
      );

    const maximum =
      this.mobile
        ? 105
        : 190;

    const desiredCount =
      Math.floor(
        maximum *
          this.intensity,
      );

    while (
      this.drops.length <
      desiredCount
    ) {
      this.drops.push(
        this.createDrop(
          true,
        ),
      );
    }

    if (
      this.drops.length >
      desiredCount + 8
    ) {
      this.drops.length =
        desiredCount + 8;
    }

    const context =
      this.context;

    context.clearRect(
      0,
      0,
      this.width,
      this.height,
    );

    context.lineCap =
      'round';

    for (
      const drop of
      this.drops
    ) {
      drop.y +=
        drop.speed *
        delta;

      drop.x -=
        drop.wind *
        delta;

      if (
        drop.y >
          this.height +
            drop.length ||
        drop.x < -100
      ) {
        Object.assign(
          drop,
          this.createDrop(
            false,
          ),
        );
      }

      context.beginPath();

      context.moveTo(
        drop.x,
        drop.y,
      );

      context.lineTo(
        drop.x +
          drop.wind *
            0.055,

        drop.y +
          drop.length,
      );

      context.lineWidth =
        drop.width;

      context.strokeStyle =
        `rgba(70, 145, 205, ${
          drop.alpha *
          (
            0.45 +
            this.intensity *
              0.55
          )
        })`;

      context.stroke();
    }
  }

  createDrop(
    randomY,
  ) {
    const hasSource =
      this.sourceX !== null &&
      this.sourceY !== null;

    const spawnMinX =
      hasSource
        ? this.sourceX -
          this.sourceSpread /
            2
        : -20;

    const spawnMaxX =
      hasSource
        ? this.sourceX +
          this.sourceSpread /
            2
        : this.width + 100;

    return {
      x:
        randomBetween(
          spawnMinX,
          spawnMaxX,
        ),

      y:
        randomY
          ? hasSource
            ? randomBetween(
                this.sourceY,
                this.height,
              )
            : randomBetween(
                -this.height,
                this.height,
              )
          : hasSource
            ? randomBetween(
                this.sourceY -
                  70,
                this.sourceY -
                  15,
              )
            : randomBetween(
                -180,
                -20,
              ),

      length:
        randomBetween(
          this.mobile
            ? 18
            : 22,

          this.mobile
            ? 46
            : 62,
        ),

      speed:
        randomBetween(
          this.mobile
            ? 440
            : 520,

          this.mobile
            ? 800
            : 980,
        ),

      wind:
        randomBetween(
          110,
          190,
        ),

      width:
        randomBetween(
          0.65,
          1.65,
        ),

      alpha:
        randomBetween(
          0.18,
          0.72,
        ),
    };
  }
}

// 구름 아래 깔리는 "바닥 그림자" 스프라이트에 쓸 텍스처를 만드는 함수.
// 이미지 파일을 따로 두지 않고, 2D canvas에 그때그때 radial-gradient(원형
// 그라데이션)를 그려서 "가운데는 진하고 가장자리로 갈수록 투명해지는"
// 부드러운 얼룩 이미지를 즉석에서 만든다. 이 canvas를 THREE.CanvasTexture로
// 감싸면 Three.js에서 일반 이미지 텍스처처럼 쓸 수 있다.
function createSoftShadowTexture() {
  const size = 128;

  const canvas =
    document.createElement(
      'canvas',
    );

  canvas.width = size;
  canvas.height = size;

  const context =
    canvas.getContext(
      '2d',
    );

  const gradient =
    context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );

  // 가운데(0)는 꽤 진하게, 가장자리(1)는 완전히 투명하게.
  // 중간에 값을 하나 더 넣어서(0.6) 가장자리로 갈수록 옅어지는
  // 속도가 자연스럽게 느려지도록(급격히 뚝 끊기지 않도록) 한다
  gradient.addColorStop(
    0,
    'rgba(0, 0, 0, 0.55)',
  );

  gradient.addColorStop(
    0.6,
    'rgba(0, 0, 0, 0.22)',
  );

  gradient.addColorStop(
    1,
    'rgba(0, 0, 0, 0)',
  );

  context.fillStyle =
    gradient;

  context.fillRect(
    0,
    0,
    size,
    size,
  );

  const texture =
    new THREE.CanvasTexture(
      canvas,
    );

  texture.needsUpdate = true;

  return texture;
}

// GLTFLoader로 불러온 원본 3D 구름 모델(source)을 복제해서, 크기를 1 단위로
// 정규화(normalize)하고 지정된 색(color)을 입혀서 재사용하기 쉬운 형태로 만들어 반환하는 함수.
// 모델 파일마다 원래 크기가 제각각이라, 이렇게 정규화해야 CONFIG의 배율(scale)로
// 일관되게 크기를 조절할 수 있다.
function createNormalizedCloud(
  source,
  color,
) {
  const asset =
    source.clone(true);

  asset.traverse(
    (object) => {
      if (!object.isMesh) {
        return;
      }

      object.castShadow =
        false;

      object.receiveShadow =
        false;

      object.material =
        new THREE.MeshStandardMaterial({
          color:
            color.clone(),

          roughness: 0.92,
          metalness: 0,

          transparent: true,
          opacity: 1,
        });
    },
  );

  asset.updateMatrixWorld(
    true,
  );

  const box =
    new THREE.Box3()
      .setFromObject(
        asset,
      );

  const center =
    box.getCenter(
      new THREE.Vector3(),
    );

  const size =
    box.getSize(
      new THREE.Vector3(),
    );

  const largest =
    Math.max(
      size.x,
      size.y,
      size.z,
      0.001,
    );

  asset.position.sub(
    center,
  );

  const normalized =
    new THREE.Group();

  normalized.scale.setScalar(
    1 / largest,
  );

  normalized.add(
    asset,
  );

  return normalized;
}

// 3D 오브젝트(root) 안의 모든 메쉬(mesh)를 훑어서 투명도(opacity)를 한꺼번에 바꿔주는
// 도우미 함수. object.traverse는 자식/손자 요소까지 전부 방문하는 Three.js 메서드다.
function setObjectOpacity(
  root,
  opacity,
) {
  const value =
    THREE.MathUtils.clamp(
      opacity,
      0,
      1,
    );

  root.traverse(
    (object) => {
      if (
        !object.isMesh ||
        !object.material
      ) {
        return;
      }

      object.material.transparent =
        true;

      object.material.opacity =
        value;

      object.material.depthWrite =
        value > 0.98;
    },
  );
}

// 3D 오브젝트(root) 안의 모든 메쉬의 색을 한꺼번에 바꿔주는 도우미 함수 (setObjectOpacity와 비슷한 방식)
function setObjectColor(
  root,
  color,
) {
  root.traverse(
    (object) => {
      if (
        object.isMesh &&
        object.material?.color
      ) {
        object.material.color.copy(
          color,
        );
      }
    },
  );
}

// 구름 5개의 현재 위치를 바탕으로 "무게중심(centroid)"과 "얼마나 퍼져있는지(spread)"를
// 계산하는 함수. spread가 충분히 작아지면(=구름들이 서로 가까워지면) 합체 조건이 충족된다.
function calculateMetrics(
  clouds,
) {
  const centroid =
    new THREE.Vector3();

  const min =
    new THREE.Vector3(
      Infinity,
      Infinity,
      Infinity,
    );

  const max =
    new THREE.Vector3(
      -Infinity,
      -Infinity,
      -Infinity,
    );

  clouds.forEach(
    (cloud) => {
      centroid.add(
        cloud.position,
      );

      min.min(
        cloud.position,
      );

      max.max(
        cloud.position,
      );
    },
  );

  centroid.multiplyScalar(
    1 / clouds.length,
  );

  let spread = 0;

  clouds.forEach(
    (cloud) => {
      spread =
        Math.max(
          spread,
          cloud.position
            .distanceTo(
              centroid,
            ),
        );
    },
  );

  return {
    centroid,
    spread,

    rangeX:
      max.x - min.x,

    rangeY:
      max.y - min.y,
  };
}

// current 위치를 target 방향으로 최대 maxDistance만큼만 이동시키는 도우미 함수.
// 한 번에 목표까지 순간이동하지 않고, 프레임마다 조금씩 다가가게 해서 부드러운 움직임을 만든다.
function moveTowards(
  current,
  target,
  maxDistance,
  temp,
) {
  temp.subVectors(
    target,
    current,
  );

  const distance =
    temp.length();

  if (
    distance <=
      maxDistance ||
    distance === 0
  ) {
    current.copy(
      target,
    );
  } else {
    current.addScaledVector(
      temp,
      maxDistance /
        distance,
    );
  }
}

// 3D 장면 안의 좌표(position)를 화면(브라우저 창) 위의 실제 픽셀 좌표로 변환하는 함수.
// 예: hero 구름이 지금 화면의 어느 픽셀 위치에 보이는지 알아내서, 그 아래에 비를 내리게 할 때 쓰인다.
function worldToViewport(
  position,
  camera,
  canvas,
) {
  const point =
    position
      .clone()
      .project(
        camera,
      );

  const rect =
    canvas.getBoundingClientRect();

  return {
    x:
      rect.left +
      (
        point.x *
          0.5 +
        0.5
      ) *
        rect.width,

    y:
      rect.top +
      (
        -point.y *
          0.5 +
        0.5
      ) *
        rect.height,
  };
}

// value가 edge0~edge1 구간 안에서 얼마나 진행됐는지를 0~1 사이 값으로 반환하되,
// 시작과 끝에서는 느리고 중간에서는 빠르게 변하는 부드러운 곡선(S자 커브)으로 계산하는 함수.
// 애니메이션 진행도를 뚝뚝 끊기지 않고 자연스럽게 만들 때 자주 쓰인다.
function smoothstep(
  edge0,
  edge1,
  value,
) {
  const x =
    clamp01(
      (
        value -
        edge0
      ) /
        (
          edge1 -
          edge0
        ),
    );

  return (
    x *
    x *
    (
      3 -
      2 * x
    )
  );
}

// value(0~1)를 "천천히 시작해서 빨라졌다가 다시 천천히 끝나는" 세제곱 곡선으로 변환하는
// 이징(easing) 함수. 애니메이션이 기계적이지 않고 자연스럽게 느껴지도록 도와준다.
function easeInOutCubic(
  value,
) {
  return value < 0.5
    ? 4 *
        value *
        value *
        value
    : 1 -
        Math.pow(
          -2 * value + 2,
          3,
        ) /
          2;
}

// value를 0과 1 사이 범위로 강제로 잘라내는 도우미 함수(0보다 작으면 0, 1보다 크면 1)
function clamp01(
  value,
) {
  return THREE.MathUtils.clamp(
    value,
    0,
    1,
  );
}

// minimum과 maximum 사이의 임의의(random) 실수 하나를 반환하는 도우미 함수
function randomBetween(
  minimum,
  maximum,
) {
  return (
    minimum +
    Math.random() *
      (
        maximum -
        minimum
      )
  );
}

// 0부터 (length-1)까지의 숫자를 담은 배열을 무작위로 뒤섞어(shuffle) 반환하는 함수.
// 글자들이 항상 똑같은 순서로 떨어지지 않고 매번 다른 순서로 보이게 할 때 쓰인다.
function shuffledIndices(
  length,
) {
  const order = Array.from(
    { length },
    (_, index) => index,
  );

  for (
    let i = order.length - 1;
    i > 0;
    i -= 1
  ) {
    const j = Math.floor(
      Math.random() * (i + 1),
    );

    [order[i], order[j]] = [
      order[j],
      order[i],
    ];
  }

  return order;
}

// 지정한 시간(milliseconds)만큼 기다리는 Promise를 반환하는 함수.
// async 함수 안에서 "await wait(500)"처럼 써서 0.5초 동안 코드 실행을 잠시 멈출 수 있다.
function wait(
  milliseconds,
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

// 브라우저가 다음 화면을 실제로 한 번 그릴 때까지 기다리는 Promise를 반환하는 함수.
// requestAnimationFrame을 두 번 겹쳐서 써서, 방금 바꾼 CSS/스타일 변경이 화면에
// 확실히 반영된 뒤에 다음 코드가 실행되도록 보장한다.
function nextPaint() {
  return new Promise(
    (resolve) =>
      requestAnimationFrame(
        () =>
          requestAnimationFrame(
            resolve,
          ),
      ),
  );
}

// 3D 연출을 로드하는 중 에러가 나거나(startIdentityExperience에서 catch됨) 실행할 수 없을 때
// 호출되는 함수. 화면을 곧바로 "이미 다 끝난 최종 상태"처럼 만들어서, 애니메이션 없이도
// 최소한 본문 텍스트는 정상적으로 읽을 수 있게 해준다.
function showFallback(
  root,
) {
  document.body.classList.remove(
    'identity-intro-active',
  );

  root.classList.add(
    'is-ready',
    'is-clearing',
    'is-final',
  );

  root
    .querySelectorAll(
      '.rain-word-target',
    )
    .forEach(
      (target) => {
        target.classList.add(
          'has-landed',
        );
      },
    );

  const hint =
    root.querySelector(
      '#identity-hint',
    );

  if (hint) {
    hint.textContent =
      '3D 연출을 불러오지 못해 본문을 표시합니다.';
  }
}
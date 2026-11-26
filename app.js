(function () {
  "use strict";

  if (typeof HEROES === "undefined" || !Array.isArray(HEROES) || HEROES.length === 0) {
    return;
  }

  var GRADE_ORDER = ["명인", "전설", "신화"];
  var GRADE_THEMES = {
    "일반병": {
      bg: "radial-gradient(circle at 75% 45%, #1d212b 0%, #151620 60%, #12131C 100%)",
      chipBorder: "#888F9E",
      chipColor: "#C5BCAB"
    },
    "숙련": {
      bg: "radial-gradient(circle at 75% 45%, #14282a 0%, #111a1d 60%, #12131C 100%)",
      chipBorder: "#81d5ca",
      chipColor: "#81d5ca"
    },
    "명인": {
      bg: "radial-gradient(circle at 75% 45%, #19273c 0%, #121926 60%, #12131C 100%)",
      chipBorder: "#78A6E8",
      chipColor: "#78A6E8"
    },
    "전설": {
      bg: "radial-gradient(circle at 75% 45%, #38151b 0%, #1c1322 60%, #12131C 100%)",
      chipBorder: "#D6A94B",
      chipColor: "#D6A94B"
    },
    "신화": {
      bg: "radial-gradient(circle at 75% 45%, #34143a 0%, #201328 60%, #12131C 100%)",
      chipBorder: "#D88BFF",
      chipColor: "#EBBFFF"
    }
  };

  var TILE_HEIGHT = 76;
  var TILE_GAP = 6;
  var TILE_PITCH = TILE_HEIGHT + TILE_GAP;

  // Main & Navigation Elements
  var appShell = document.getElementById("appShell");
  var mainSection = document.getElementById("main");
  var worldSection = document.getElementById("world");
  var rosterSection = document.getElementById("roster");
  var mainMenuBtn = document.getElementById("mainMenuBtn");
  var mainNavPopover = document.getElementById("mainNavPopover");
  var mainHeroImg = document.getElementById("mainHeroImg");
  var mainCardSilhouette = document.getElementById("mainCardSilhouette");
  var mainRosterCountLabel = document.getElementById("mainRosterCountLabel");

  // Roster Elements
  var totalHeroCountEl = document.getElementById("totalHeroCount");
  var filterChipsEl = document.getElementById("filterChips");
  var characterStage = document.getElementById("characterStage");
  var heroWheel = document.getElementById("heroWheel");
  var wheelUpBtn = document.getElementById("wheelUpBtn");
  var wheelDownBtn = document.getElementById("wheelDownBtn");
  var currentCounterEl = document.getElementById("currentCounter");
  var filteredTotalCounterEl = document.getElementById("filteredTotalCounter");

  var stagePortraitImg = document.getElementById("stagePortraitImg");
  var stagePlaceholder = document.getElementById("stagePlaceholder");
  var heroGradeChipEl = document.getElementById("heroGradeChip");
  var heroWeaponLineEl = document.getElementById("heroWeaponLine");
  var heroNameEl = document.getElementById("heroName");
  var openDetailBtn = document.getElementById("openDetailBtn");

  // Detail Sheet Elements
  var sheetOverlay = document.getElementById("sheetOverlay");
  var sheetBackdrop = document.getElementById("sheetBackdrop");
  var detailSheet = document.getElementById("detailSheet");
  var sheetTopbar = document.getElementById("sheetTopbar");
  var sheetImageZone = document.getElementById("sheetImageZone");
  var sheetCloseBtn = document.getElementById("sheetCloseBtn");
  var sheetPortraitImg = document.getElementById("sheetPortraitImg");
  var sheetPlaceholder = document.getElementById("sheetPlaceholder");
  var sheetWeaponEl = document.getElementById("sheetWeapon");
  var sheetGradeEl = document.getElementById("sheetGrade");
  var sheetAliasEl = document.getElementById("sheetAlias");
  var sheetHeroNameEl = document.getElementById("sheetHeroName");
  var sheetHeroCultureEl = document.getElementById("sheetHeroCulture");
  var sheetMoveNameEl = document.getElementById("sheetMoveName");
  var sheetLegendEl = document.getElementById("sheetLegend");
  var sheetBody = document.getElementById("sheetBody");

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function prefersReducedMotion() {
    return motionQuery.matches;
  }

  // State
  var currentFilter = "전체";
  var filteredHeroes = HEROES.slice();
  var currentIndex = 0;
  var tileEls = [];
  var spacerTop = null;
  var spacerBottom = null;
  var scrollRafId = null;
  var settleTimerId = null;
  var isProgrammaticScroll = false;
  var programmaticTimerId = null;
  var lastLatchedHeroId = null;
  var previouslyFocusedEl = null;
  var isSheetOpen = false;
  var openedSheetViaPush = false;
  var imageCache = {}; // src -> "loading" | "loaded" | "error"
  var activeStageImageRequest = "";
  var activeSheetImageRequest = "";

  function pad2(num) {
    return String(num).padStart(2, "0");
  }

  function triggerHaptic() {
    if (prefersReducedMotion()) return;
    if (!navigator.vibrate) return;
    if (!/Android/i.test(navigator.userAgent)) return;
    try {
      navigator.vibrate(10);
    } catch (_) {
      // Ignore if blocked by WebView policy
    }
  }

  // Main Hero Image fallback handling
  if (mainHeroImg && mainCardSilhouette) {
    mainHeroImg.addEventListener("load", function () {
      mainCardSilhouette.classList.add("is-hidden");
    });
    mainHeroImg.addEventListener("error", function () {
      mainHeroImg.style.display = "none";
      mainCardSilhouette.classList.remove("is-hidden");
    });
  }

  // Main Quick Menu Popover
  function closeMainMenu() {
    if (!mainNavPopover || !mainMenuBtn) return;
    mainNavPopover.hidden = true;
    mainMenuBtn.setAttribute("aria-expanded", "false");
  }

  if (mainMenuBtn && mainNavPopover) {
    mainMenuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var willOpen = mainNavPopover.hidden;
      mainNavPopover.hidden = !willOpen;
      mainMenuBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });

    document.addEventListener("click", function (e) {
      if (!mainNavPopover.hidden && !e.target.closest(".main-menu-wrap")) {
        closeMainMenu();
      }
    });
  }

  // Section Scroll & Navigation Helpers
  function getSectionElement(sectionId) {
    if (sectionId === "main") return mainSection;
    if (sectionId === "world") return worldSection;
    if (sectionId === "roster") return rosterSection;
    return null;
  }

  function scrollToSection(sectionId, smooth) {
    var el = getSectionElement(sectionId);
    if (!el) return;
    var useSmooth = Boolean(smooth && !prefersReducedMotion());
    el.scrollIntoView({
      behavior: useSmooth ? "smooth" : "auto",
      block: "start"
    });
  }

  function navigateToSection(sectionId, smooth) {
    var targetHash = "#" + sectionId;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
    scrollToSection(sectionId, smooth);
  }

  // Bind TOC cards, World CTA, Brand link, and Menu links
  var navLinks = document.querySelectorAll("[data-nav-target]");
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("data-nav-target");
      if (!targetId) return;
      e.preventDefault();
      closeMainMenu();
      navigateToSection(targetId, true);
    });
  });

  function preloadImage(src) {
    if (!src || imageCache[src]) return;
    imageCache[src] = "loading";
    var pre = new Image();
    pre.onload = function () {
      imageCache[src] = "loaded";
    };
    pre.onerror = function () {
      imageCache[src] = "error";
    };
    pre.src = src;
  }

  function preloadNeighbors(index) {
    var prev = filteredHeroes[index - 1];
    var next = filteredHeroes[index + 1];
    if (prev && prev.image) preloadImage(prev.image);
    if (next && next.image) preloadImage(next.image);
  }

  function setPortraitImage(imgEl, placeholderEl, hero, isStage) {
    var src = hero.image || "";
    var altText = hero.name + " 인물 이미지";

    if (isStage) {
      activeStageImageRequest = src;
    } else {
      activeSheetImageRequest = src;
    }

    if (!src || imageCache[src] === "error") {
      imgEl.classList.remove("is-loaded");
      imgEl.classList.add("is-hidden");
      imgEl.removeAttribute("src");
      imgEl.alt = altText;
      placeholderEl.classList.remove("is-hidden");
      return;
    }

    imgEl.alt = altText;
    imgEl.classList.remove("is-hidden");

    if (imageCache[src] === "loaded") {
      if (imgEl.getAttribute("src") !== src) {
        imgEl.classList.remove("is-loaded");
        imgEl.src = src;
      }
      placeholderEl.classList.add("is-hidden");
      requestAnimationFrame(function () {
        imgEl.classList.add("is-loaded");
      });
      return;
    }

    // Loading state: keep placeholder visible until load finishes
    imgEl.classList.remove("is-loaded");
    placeholderEl.classList.remove("is-hidden");

    imgEl.onload = function () {
      imageCache[src] = "loaded";
      var latest = isStage ? activeStageImageRequest : activeSheetImageRequest;
      if (latest !== src) return;
      placeholderEl.classList.add("is-hidden");
      imgEl.classList.add("is-loaded");
    };

    imgEl.onerror = function () {
      imageCache[src] = "error";
      var latest = isStage ? activeStageImageRequest : activeSheetImageRequest;
      if (latest !== src) return;
      imgEl.classList.remove("is-loaded");
      imgEl.classList.add("is-hidden");
      placeholderEl.classList.remove("is-hidden");
    };

    imgEl.src = src;
  }

  function buildFilterChips() {
    var counts = {};
    HEROES.forEach(function (hero) {
      counts[hero.grade] = (counts[hero.grade] || 0) + 1;
    });

    totalHeroCountEl.textContent = String(HEROES.length);
    if (mainRosterCountLabel) {
      mainRosterCountLabel.textContent = HEROES.length + "명의 무인";
    }
    filterChipsEl.innerHTML = "";

    var filters = [{ key: "전체", label: "전체 " + HEROES.length }];
    GRADE_ORDER.forEach(function (grade) {
      if (counts[grade]) {
        filters.push({ key: grade, label: grade + " " + counts[grade] });
      }
    });

    Object.keys(counts).forEach(function (grade) {
      if (GRADE_ORDER.indexOf(grade) === -1) {
        filters.push({ key: grade, label: grade + " " + counts[grade] });
      }
    });

    filters.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip" + (item.key === currentFilter ? " is-active" : "");
      btn.dataset.filter = item.key;
      btn.textContent = item.label;
      btn.setAttribute("aria-pressed", item.key === currentFilter ? "true" : "false");
      btn.addEventListener("click", function () {
        applyFilter(item.key);
      });
      filterChipsEl.appendChild(btn);
    });
  }

  function updateFilterChipUI() {
    var chips = filterChipsEl.querySelectorAll(".filter-chip");
    chips.forEach(function (chip) {
      var active = chip.dataset.filter === currentFilter;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateWheelSpacers() {
    if (!spacerTop || !spacerBottom) return;
    var wheelHeight = heroWheel.clientHeight;
    var pad = Math.max(0, Math.round((wheelHeight - TILE_HEIGHT) / 2));
    spacerTop.style.height = pad + "px";
    spacerBottom.style.height = pad + "px";
  }

  function getCenteredTileIndex() {
    if (tileEls.length === 0) return 0;
    var wheelCenter = heroWheel.scrollTop + heroWheel.clientHeight / 2;
    var bestIdx = 0;
    var bestDist = Infinity;

    for (var i = 0; i < tileEls.length; i++) {
      var tile = tileEls[i];
      var tileCenter = tile.offsetTop + tile.offsetHeight / 2;
      var dist = Math.abs(tileCenter - wheelCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function applyWheelPerspective() {
    if (tileEls.length === 0) return;
    var wheelCenter = heroWheel.scrollTop + heroWheel.clientHeight / 2;

    for (var i = 0; i < tileEls.length; i++) {
      var tile = tileEls[i];
      var tileCenter = tile.offsetTop + tile.offsetHeight / 2;
      var distSlots = Math.abs(tileCenter - wheelCenter) / TILE_PITCH;

      var scale;
      var opacity;

      if (distSlots <= 1) {
        scale = 1 - 0.2 * distSlots;
        opacity = 1 - 0.3 * distSlots;
      } else if (distSlots <= 2) {
        scale = 0.8 - 0.26 * (distSlots - 1);
        opacity = 0.7 - 0.3 * (distSlots - 1);
      } else {
        scale = 0.5;
        opacity = Math.max(0.25, 0.4 - 0.1 * (distSlots - 2));
      }

      tile.style.setProperty("--tile-scale", scale.toFixed(3));
      tile.style.setProperty("--tile-opacity", opacity.toFixed(3));
    }
  }

  function updateActiveTileClasses(index) {
    tileEls.forEach(function (tile, idx) {
      var isActive = idx === index;
      tile.classList.toggle("tile-active", isActive);
      if (isActive) {
        tile.setAttribute("aria-selected", "true");
        tile.setAttribute("aria-current", "true");
      } else {
        tile.setAttribute("aria-selected", "false");
        tile.removeAttribute("aria-current");
      }
    });
  }

  function triggerLatchAnimation(index) {
    var tile = tileEls[index];
    if (!tile || prefersReducedMotion()) return;
    tile.classList.remove("tile-latch");
    void tile.offsetWidth;
    tile.classList.add("tile-latch");
  }

  function renderStageHero(index, options) {
    var opts = options || {};
    if (filteredHeroes.length === 0) return;
    if (index < 0) index = 0;
    if (index >= filteredHeroes.length) index = filteredHeroes.length - 1;

    currentIndex = index;
    var hero = filteredHeroes[currentIndex];
    var isNewHero = lastLatchedHeroId !== hero.id;
    lastLatchedHeroId = hero.id;

    var theme = GRADE_THEMES[hero.grade] || GRADE_THEMES["전설"];
    characterStage.style.background = theme.bg;
    heroGradeChipEl.style.borderColor = theme.chipBorder;
    heroGradeChipEl.style.color = theme.chipColor;

    heroGradeChipEl.textContent = hero.grade;
    heroWeaponLineEl.textContent = hero.weapon + " · " + hero.culture;
    heroNameEl.textContent = hero.name;

    currentCounterEl.textContent = pad2(currentIndex + 1);
    filteredTotalCounterEl.textContent = "/ " + pad2(filteredHeroes.length);

    updateActiveTileClasses(currentIndex);
    setPortraitImage(stagePortraitImg, stagePlaceholder, hero, true);
    preloadNeighbors(currentIndex);

    if (opts.latch && isNewHero) {
      triggerLatchAnimation(currentIndex);
      triggerHaptic();
    }
  }

  function scrollToTileIndex(index, smooth) {
    var tile = tileEls[index];
    if (!tile) return;

    updateWheelSpacers();
    var targetTop = tile.offsetTop - (heroWheel.clientHeight - tile.offsetHeight) / 2;
    var useSmooth = Boolean(smooth && !prefersReducedMotion());

    clearTimeout(programmaticTimerId);
    isProgrammaticScroll = useSmooth;

    heroWheel.scrollTo({
      top: Math.max(0, targetTop),
      behavior: useSmooth ? "smooth" : "auto"
    });

    if (useSmooth) {
      programmaticTimerId = setTimeout(function () {
        isProgrammaticScroll = false;
        applyWheelPerspective();
        triggerLatchAnimation(index);
      }, 320);
    } else {
      applyWheelPerspective();
    }
  }

  function selectHero(index, options) {
    var opts = options || {};
    if (filteredHeroes.length === 0) return;
    if (index < 0) index = filteredHeroes.length - 1;
    if (index >= filteredHeroes.length) index = 0;

    renderStageHero(index, { latch: opts.latch && !opts.smooth });
    scrollToTileIndex(index, opts.smooth);
    if (opts.latch && opts.smooth) {
      triggerHaptic();
    }
  }

  function renderWheelTiles() {
    heroWheel.innerHTML = "";
    tileEls = [];

    spacerTop = document.createElement("div");
    spacerTop.className = "wheel-spacer";
    spacerTop.setAttribute("aria-hidden", "true");
    heroWheel.appendChild(spacerTop);

    filteredHeroes.forEach(function (hero, idx) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "wheel-tile";
      tile.dataset.index = String(idx);
      tile.setAttribute("role", "option");
      tile.setAttribute("aria-selected", "false");

      var leftBar = document.createElement("span");
      leftBar.className = "tile-left-bar";
      leftBar.setAttribute("aria-hidden", "true");

      var meta = document.createElement("div");
      meta.className = "tile-meta";

      var culture = document.createElement("span");
      culture.className = "tile-culture";
      culture.textContent = hero.culture;

      var grade = document.createElement("span");
      grade.className = "tile-grade";
      grade.textContent = hero.grade;

      meta.appendChild(culture);
      meta.appendChild(grade);

      var nameEl = document.createElement("h3");
      nameEl.className = "tile-name";
      nameEl.textContent = hero.name;

      tile.appendChild(leftBar);
      tile.appendChild(meta);
      tile.appendChild(nameEl);

      tile.addEventListener("click", function () {
        if (idx === currentIndex) {
          openDetailSheet(filteredHeroes[idx]);
          return;
        }
        selectHero(idx, { smooth: true, latch: true });
      });

      heroWheel.appendChild(tile);
      tileEls.push(tile);
    });

    spacerBottom = document.createElement("div");
    spacerBottom.className = "wheel-spacer";
    spacerBottom.setAttribute("aria-hidden", "true");
    heroWheel.appendChild(spacerBottom);

    updateWheelSpacers();
  }

  function applyFilter(filterKey, preferredHeroId) {
    var prevHero = filteredHeroes[currentIndex];
    var targetHeroId = preferredHeroId || (prevHero ? prevHero.id : null);

    currentFilter = filterKey;
    updateFilterChipUI();

    if (currentFilter === "전체") {
      filteredHeroes = HEROES.slice();
    } else {
      filteredHeroes = HEROES.filter(function (hero) {
        return hero.grade === currentFilter;
      });
    }

    var nextIndex = 0;
    if (targetHeroId) {
      for (var i = 0; i < filteredHeroes.length; i++) {
        if (filteredHeroes[i].id === targetHeroId) {
          nextIndex = i;
          break;
        }
      }
    }

    renderWheelTiles();
    renderStageHero(nextIndex, { latch: false });
    scrollToTileIndex(nextIndex, false);
  }

  // Wheel scroll handling
  function handleWheelSettled() {
    if (isProgrammaticScroll) return;
    var centered = getCenteredTileIndex();
    if (centered !== currentIndex) {
      renderStageHero(centered, { latch: true });
    } else {
      triggerLatchAnimation(centered);
    }
  }

  heroWheel.addEventListener(
    "scroll",
    function () {
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      scrollRafId = requestAnimationFrame(function () {
        applyWheelPerspective();
        if (!isProgrammaticScroll) {
          var centered = getCenteredTileIndex();
          if (centered !== currentIndex) {
            renderStageHero(centered, { latch: false });
          }
        }
      });

      clearTimeout(settleTimerId);
      settleTimerId = setTimeout(handleWheelSettled, 120);
    },
    { passive: true }
  );

  if ("onscrollend" in heroWheel) {
    heroWheel.addEventListener("scrollend", function () {
      clearTimeout(settleTimerId);
      handleWheelSettled();
    });
  }

  wheelUpBtn.addEventListener("click", function () {
    selectHero(currentIndex - 1, { smooth: true, latch: true });
  });

  wheelDownBtn.addEventListener("click", function () {
    selectHero(currentIndex + 1, { smooth: true, latch: true });
  });

  // Detail Sheet logic
  function populateSheet(hero) {
    sheetWeaponEl.textContent = hero.weapon;
    sheetGradeEl.textContent = hero.grade;

    var aliasText = hero.alias ? hero.alias.trim() : "";
    if (aliasText) {
      sheetAliasEl.textContent = aliasText;
      sheetAliasEl.classList.remove("is-empty");
    } else {
      sheetAliasEl.textContent = "—";
      sheetAliasEl.classList.add("is-empty");
    }

    sheetHeroNameEl.textContent = hero.name;
    sheetHeroCultureEl.textContent = hero.culture;
    sheetMoveNameEl.textContent = hero.move;
    sheetLegendEl.textContent = hero.legend;
    sheetBody.scrollTop = 0;

    setPortraitImage(sheetPortraitImg, sheetPlaceholder, hero, false);
  }

  function openDetailSheet(hero, options) {
    var opts = options || {};
    if (!hero) return;

    if (!isSheetOpen) {
      previouslyFocusedEl = document.activeElement;
    }

    populateSheet(hero);
    detailSheet.style.transform = "";
    detailSheet.classList.remove("is-dragging");
    sheetOverlay.hidden = false;
    document.body.classList.add("sheet-locked");
    appShell.setAttribute("aria-hidden", "true");

    void sheetOverlay.offsetWidth;
    sheetOverlay.classList.add("is-open");
    isSheetOpen = true;

    if (!opts.skipHash) {
      var targetHash = "#hero-" + hero.id;
      if (window.location.hash !== targetHash) {
        if (window.location.hash !== "#roster") {
          window.history.replaceState(null, "", "#roster");
        }
        openedSheetViaPush = true;
        window.history.pushState(null, "", targetHash);
      }
    }

    requestAnimationFrame(function () {
      sheetCloseBtn.focus();
    });
  }

  function closeDetailSheet(options) {
    var opts = options || {};
    if (!isSheetOpen) return;

    isSheetOpen = false;
    sheetOverlay.classList.remove("is-open");
    document.body.classList.remove("sheet-locked");
    appShell.removeAttribute("aria-hidden");
    detailSheet.style.transform = "";
    detailSheet.classList.remove("is-dragging");

    var finishHide = function () {
      if (!isSheetOpen) {
        sheetOverlay.hidden = true;
        if (previouslyFocusedEl && typeof previouslyFocusedEl.focus === "function") {
          previouslyFocusedEl.focus();
        } else {
          openDetailBtn.focus();
        }
        previouslyFocusedEl = null;
      }
    };

    if (prefersReducedMotion()) {
      finishHide();
    } else {
      setTimeout(finishHide, 280);
    }

    if (!opts.fromHashChange && window.location.hash.indexOf("#hero-") === 0) {
      if (openedSheetViaPush) {
        openedSheetViaPush = false;
        window.history.back();
      } else {
        window.history.replaceState(null, "", "#roster");
      }
    } else if (opts.fromHashChange) {
      openedSheetViaPush = false;
    }
  }

  openDetailBtn.addEventListener("click", function () {
    openDetailSheet(filteredHeroes[currentIndex]);
  });

  sheetCloseBtn.addEventListener("click", function () {
    closeDetailSheet();
  });

  sheetBackdrop.addEventListener("click", function () {
    closeDetailSheet();
  });

  // Swipe-down gesture to close sheet
  var swipeStartY = null;
  var swipeCurrentDelta = 0;
  var swipeActive = false;

  function onSwipeStart(clientY, canStart) {
    if (!isSheetOpen || !canStart) return;
    swipeStartY = clientY;
    swipeCurrentDelta = 0;
    swipeActive = true;
  }

  function onSwipeMove(clientY, event) {
    if (!swipeActive || swipeStartY === null) return;
    var delta = clientY - swipeStartY;
    if (delta > 0) {
      swipeCurrentDelta = delta;
      detailSheet.classList.add("is-dragging");
      detailSheet.style.transform = "translateY(" + delta + "px)";
      if (event && event.cancelable) {
        event.preventDefault();
      }
    } else {
      swipeCurrentDelta = 0;
      detailSheet.style.transform = "";
    }
  }

  function onSwipeEnd() {
    if (!swipeActive) return;
    swipeActive = false;
    swipeStartY = null;
    detailSheet.classList.remove("is-dragging");

    if (swipeCurrentDelta > 80) {
      closeDetailSheet();
    } else {
      detailSheet.style.transform = "";
    }
    swipeCurrentDelta = 0;
  }

  [sheetTopbar, sheetImageZone].forEach(function (zone) {
    zone.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        if (e.target.closest("#sheetCloseBtn")) return;
        onSwipeStart(e.touches[0].clientY, true);
      },
      { passive: true }
    );

    zone.addEventListener(
      "touchmove",
      function (e) {
        if (e.touches.length !== 1) return;
        onSwipeMove(e.touches[0].clientY, e);
      },
      { passive: false }
    );

    zone.addEventListener("touchend", onSwipeEnd, { passive: true });
    zone.addEventListener("touchcancel", onSwipeEnd, { passive: true });
  });

  sheetBody.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      onSwipeStart(e.touches[0].clientY, sheetBody.scrollTop <= 0);
    },
    { passive: true }
  );

  sheetBody.addEventListener(
    "touchmove",
    function (e) {
      if (!swipeActive || e.touches.length !== 1) return;
      if (sheetBody.scrollTop > 0) {
        swipeActive = false;
        detailSheet.classList.remove("is-dragging");
        detailSheet.style.transform = "";
        return;
      }
      onSwipeMove(e.touches[0].clientY, e);
    },
    { passive: false }
  );

  sheetBody.addEventListener("touchend", onSwipeEnd, { passive: true });
  sheetBody.addEventListener("touchcancel", onSwipeEnd, { passive: true });

  // Keyboard navigation
  window.addEventListener("keydown", function (e) {
    if (isSheetOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetailSheet();
      }
      return;
    }

    if (e.key === "Escape" && mainNavPopover && !mainNavPopover.hidden) {
      closeMainMenu();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectHero(currentIndex - 1, { smooth: true, latch: true });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectHero(currentIndex + 1, { smooth: true, latch: true });
    }
  });

  // Hash Routing (#main, #world, #roster, #hero-NN)
  function parseHeroIdFromHash(hash) {
    var match = /^#hero-(\d{2})$/.exec(hash || "");
    return match ? match[1] : null;
  }

  function findHeroById(id) {
    for (var i = 0; i < HEROES.length; i++) {
      if (HEROES[i].id === id) return HEROES[i];
    }
    return null;
  }

  function syncFromHash(isInitial) {
    var hash = window.location.hash;
    var heroId = parseHeroIdFromHash(hash);

    if (heroId) {
      var hero = findHeroById(heroId);
      if (hero) {
        scrollToSection("roster", false);
        var inCurrentFilter = filteredHeroes.some(function (item) {
          return item.id === hero.id;
        });
        if (!inCurrentFilter) {
          applyFilter("전체", hero.id);
        } else {
          for (var i = 0; i < filteredHeroes.length; i++) {
            if (filteredHeroes[i].id === hero.id) {
              renderStageHero(i, { latch: false });
              scrollToTileIndex(i, false);
              break;
            }
          }
        }
        openDetailSheet(hero, { skipHash: true });
        return;
      }
    }

    if (isSheetOpen) {
      closeDetailSheet({ fromHashChange: true });
    }

    if (hash === "#world" || hash === "#roster" || hash === "#main") {
      scrollToSection(hash.slice(1), !isInitial);
    } else if (isInitial && !hash) {
      window.history.replaceState(null, "", "#main");
      scrollToSection("main", false);
    }
  }

  window.addEventListener("hashchange", function () {
    syncFromHash(false);
  });

  window.addEventListener("popstate", function () {
    syncFromHash(false);
  });

  window.addEventListener("resize", function () {
    updateWheelSpacers();
    scrollToTileIndex(currentIndex, false);
    applyWheelPerspective();
  });

  // Initial boot
  buildFilterChips();
  applyFilter("전체", HEROES[0].id);
  syncFromHash(true);
})();

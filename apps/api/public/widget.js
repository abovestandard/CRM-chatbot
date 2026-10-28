(function () {
  "use strict";

  // Must run synchronously at top-level so `document.currentScript` is the
  // <script> tag that loaded this file, even when it has async/defer.
  var scriptEl = document.currentScript;
  if (!scriptEl) return;

  var apiKey = scriptEl.getAttribute("data-api-key");
  var apiBase = scriptEl.getAttribute("data-api-base") || new URL(scriptEl.src).origin;

  if (!apiKey) {
    console.error("[AI Chatbot] Missing data-api-key attribute on the widget <script> tag.");
    return;
  }

  var storagePrefix = "ai_chatbot_widget_" + apiKey + "_";
  var FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  var Z = "2147483000";

  var settings = {
    launcherStyle: "BUBBLE",
    greetingText: "How can we help you today?",
    inputPlaceholder: "Ask a question...",
    brandColor: "#3457d5",
    logoUrl: null,
  };

  function getVisitorId() {
    var id = localStorage.getItem(storagePrefix + "visitor");
    if (!id) {
      id = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random();
      localStorage.setItem(storagePrefix + "visitor", id);
    }
    return id;
  }

  function getSessionId() {
    return sessionStorage.getItem(storagePrefix + "session") || undefined;
  }

  function setSessionId(id) {
    sessionStorage.setItem(storagePrefix + "session", id);
  }

  function clearSessionId() {
    sessionStorage.removeItem(storagePrefix + "session");
  }

  function el(tag, styles) {
    var e = document.createElement(tag);
    if (styles) Object.assign(e.style, styles);
    return e;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Minimal Markdown renderer for assistant replies — models routinely emit
  // **bold**, headings, and lists. Escapes HTML first so nothing the model
  // outputs (accidentally or via prompt injection) can inject real markup;
  // the only tags produced afterward are ones this function controls.
  function renderMarkdownLite(text) {
    var lines = escapeHtml(text).split("\n");
    var html = "";
    var listType = null;

    function closeList() {
      if (listType) {
        html += listType === "ul" ? "</ul>" : "</ol>";
        listType = null;
      }
    }

    function inline(s) {
      return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      var headerMatch = trimmed.match(/^#{1,4}\s+(.*)/);
      var ulMatch = trimmed.match(/^[-*]\s+(.*)/);
      var olMatch = trimmed.match(/^\d+\.\s+(.*)/);

      if (headerMatch) {
        closeList();
        html += '<div style="font-weight:700;margin:6px 0 4px;">' + inline(headerMatch[1]) + "</div>";
      } else if (ulMatch) {
        if (listType !== "ul") {
          closeList();
          html += '<ul style="margin:4px 0;padding-left:20px;">';
          listType = "ul";
        }
        html += "<li>" + inline(ulMatch[1]) + "</li>";
      } else if (olMatch) {
        if (listType !== "ol") {
          closeList();
          html += '<ol style="margin:4px 0;padding-left:20px;">';
          listType = "ol";
        }
        html += "<li>" + inline(olMatch[1]) + "</li>";
      } else if (trimmed === "") {
        closeList();
        html += '<div style="height:6px;"></div>';
      } else {
        closeList();
        html += "<div>" + inline(trimmed) + "</div>";
      }
    });
    closeList();
    return html;
  }

  function logoElement(size) {
    if (settings.logoUrl) {
      var img = el("img", { width: size + "px", height: size + "px", objectFit: "contain", borderRadius: "8px" });
      img.src = apiBase + settings.logoUrl;
      img.alt = "";
      return img;
    }
    var fallback = el("div", {
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      background: settings.brandColor,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(size * 0.5) + "px",
    });
    fallback.textContent = "💬";
    return fallback;
  }

  // ---- Voice input (Web Speech API) ----
  // Only Chrome/Edge/Safari(partial) support this; other browsers get no mic
  // button at all rather than a dead one that looks broken when clicked.
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  function createMicButton(size, onTranscript) {
    if (!SpeechRecognitionCtor) return null;

    var recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;

    var btn = el("button", {
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      border: "1px solid #ccc",
      background: "#fff",
      color: "#555",
      cursor: "pointer",
      fontSize: Math.round(size * 0.5) + "px",
      flexShrink: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
    });
    btn.type = "button";
    btn.setAttribute("aria-label", "Voice input");
    var iconSize = Math.round(size * 0.5);
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="' +
      iconSize +
      '" height="' +
      iconSize +
      '"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>' +
      '<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>' +
      '<line x1="12" y1="19" x2="12" y2="23"></line>' +
      '<line x1="8" y1="23" x2="16" y2="23"></line></svg>';

    var listening = false;

    recognition.addEventListener("start", function () {
      listening = true;
      btn.style.background = "#e74c3c";
      btn.style.color = "#fff";
      btn.style.borderColor = "#e74c3c";
    });

    function stopVisual() {
      listening = false;
      btn.style.background = "#fff";
      btn.style.color = "#555";
      btn.style.borderColor = "#ccc";
    }

    recognition.addEventListener("end", stopVisual);
    recognition.addEventListener("error", stopVisual);
    recognition.addEventListener("result", function (e) {
      var transcript = e.results[0][0].transcript;
      onTranscript(transcript);
    });

    btn.addEventListener("click", function () {
      if (listening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
      } catch (err) {
        // Already-started or permission errors — nothing useful to surface.
      }
    });

    return btn;
  }

  // Posts a message to the chat API and returns { ok, data }.
  function postChatMessage(text) {
    return fetch(apiBase + "/api/widget/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: apiKey,
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        message: text,
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  // Builds a self-contained chat thread (messages + suggestions + input row
  // with a mic button when supported) shared by both launcher styles.
  // `sizing` lets full-page mode use a roomier layout without duplicating
  // all the wiring logic.
  function buildChatThread(sizing) {
    // On wide viewports the thread reads better as a centered column (like
    // a chat app) than stretched edge-to-edge; `min(maxWidth, 100%)` keeps
    // it full-width on narrow/mobile screens automatically.
    var columnWidth = "min(" + (sizing.maxWidth || "100%") + ", 100%)";

    var root = el("div", {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: "0",
      alignItems: "center",
    });

    // The scrollable element is full-width so its scrollbar sits at the
    // outer edge (like ChatGPT's layout); the actual bubbles live in a
    // centered inner column matching the other rows' width.
    var messagesScroll = el("div", {
      flex: "1",
      width: "100%",
      overflowY: "auto",
    });
    var messagesEl = el("div", {
      width: columnWidth,
      margin: "0 auto",
      boxSizing: "border-box",
      padding: sizing.padding,
      display: "flex",
      flexDirection: "column",
      gap: "22px",
    });
    messagesScroll.appendChild(messagesEl);

    var suggestionsEl = el("div", {
      width: columnWidth,
      boxSizing: "border-box",
      padding: "0 " + sizing.hPad + " 8px",
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      flexShrink: "0",
    });

    var inputRow = el("form", {
      display: "flex",
      gap: "8px",
      width: columnWidth,
      boxSizing: "border-box",
      padding: sizing.padding,
      borderTop: "1px solid #eee",
      flexShrink: "0",
      alignItems: "center",
    });

    var input = el("input", {
      flex: "1",
      padding: sizing.inputPadding,
      borderRadius: "999px",
      border: "1px solid #ccc",
      fontSize: sizing.fontSize,
      minWidth: "0",
      fontFamily: FONT,
    });
    input.type = "text";
    input.placeholder = settings.inputPlaceholder;

    var sendBtn = el("button", {
      padding: sizing.inputPadding,
      borderRadius: "999px",
      border: "none",
      background: settings.brandColor,
      color: "#fff",
      cursor: "pointer",
      fontSize: sizing.fontSize,
      fontFamily: FONT,
      flexShrink: "0",
    });
    sendBtn.type = "submit";
    sendBtn.textContent = "Send";

    var micBtn = createMicButton(sizing.micSize, function (transcript) {
      input.value = transcript;
      input.focus();
    });

    inputRow.appendChild(input);
    if (micBtn) inputRow.appendChild(micBtn);
    inputRow.appendChild(sendBtn);
    root.appendChild(messagesScroll);
    root.appendChild(suggestionsEl);
    root.appendChild(inputRow);

    function appendMessage(role, text) {
      var bubble = el("div", {
        padding: "10px 14px",
        borderRadius: "12px",
        fontSize: sizing.fontSize,
        maxWidth: "80%",
        alignSelf: role === "user" ? "flex-end" : "flex-start",
        background: role === "user" ? settings.brandColor : "#f0f0f0",
        color: role === "user" ? "#fff" : "#222",
        whiteSpace: "pre-wrap",
        fontFamily: FONT,
      });
      if (role === "user") {
        bubble.textContent = text;
      } else {
        bubble.innerHTML = renderMarkdownLite(text);
      }
      messagesEl.appendChild(bubble);
      messagesScroll.scrollTop = messagesScroll.scrollHeight;
    }

    function renderSuggestions(list) {
      suggestionsEl.innerHTML = "";
      (list || []).forEach(function (s) {
        var btn = el("button", {
          padding: "5px 12px",
          borderRadius: "999px",
          border: "1px solid " + settings.brandColor,
          background: "#fff",
          color: settings.brandColor,
          fontSize: "12px",
          cursor: "pointer",
          fontFamily: FONT,
        });
        btn.type = "button";
        btn.textContent = s;
        btn.addEventListener("click", function () {
          send(s);
        });
        suggestionsEl.appendChild(btn);
      });
    }

    var sending = false;
    function send(text) {
      if (!text || sending) return;
      sending = true;
      appendMessage("user", text);
      input.value = "";
      renderSuggestions([]);

      postChatMessage(text)
        .then(function (result) {
          if (!result.ok) {
            appendMessage("assistant", (result.data && result.data.error) || "Something went wrong.");
            return;
          }
          setSessionId(result.data.sessionId);
          appendMessage("assistant", result.data.message.content);
          renderSuggestions(result.data.suggestions);
        })
        .catch(function () {
          appendMessage("assistant", "Sorry, I couldn't reach the server. Please try again.");
        })
        .finally(function () {
          sending = false;
        });
    }

    inputRow.addEventListener("submit", function (e) {
      e.preventDefault();
      send(input.value.trim());
    });

    function reset() {
      messagesEl.innerHTML = "";
      suggestionsEl.innerHTML = "";
      input.value = "";
    }

    return { root: root, input: input, send: send, reset: reset };
  }

  // ---------------- BUBBLE launcher: small floating chat window ----------------
  function mountBubble() {
    var open = false;

    var bubble = el("button", {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: settings.brandColor,
      border: "none",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      zIndex: Z,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
    });
    bubble.setAttribute("aria-label", "Open chat");
    bubble.appendChild(logoElement(32));

    var panel = el("div", {
      position: "fixed",
      bottom: "88px",
      right: "20px",
      width: "320px",
      maxWidth: "90vw",
      height: "440px",
      maxHeight: "70vh",
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: Z,
      fontFamily: FONT,
    });

    var header = el("div", {
      background: settings.brandColor,
      color: "#fff",
      padding: "12px 16px",
      fontWeight: "600",
      fontSize: "14px",
      flexShrink: "0",
    });
    header.textContent = settings.greetingText;

    var thread = buildChatThread({ padding: "12px", hPad: "12px", inputPadding: "8px 14px", fontSize: "14px", micSize: 32 });
    panel.appendChild(header);
    panel.appendChild(thread.root);

    bubble.addEventListener("click", function () {
      open = !open;
      panel.style.display = open ? "flex" : "none";
      if (open) thread.input.focus();
    });

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  // ---------------- FULLSCREEN launcher: true full-page takeover ----------------
  // Fills the entire viewport edge-to-edge (no dimmed backdrop, no card) so
  // it reads as a dedicated page rather than a popup. A persistent header
  // bar (logo + New chat + Close) appears once the conversation has started;
  // before that, just a close button floats over the centered greeting.
  function mountFullscreen() {
    var trigger = el("button", {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: settings.brandColor,
      border: "none",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      zIndex: Z,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
    });
    trigger.setAttribute("aria-label", "Open chat");
    trigger.appendChild(logoElement(32));

    var page = el("div", {
      position: "fixed",
      inset: "0",
      background: "#fbfcff",
      display: "none",
      flexDirection: "column",
      zIndex: Z,
      fontFamily: FONT,
    });

    var header = el("div", {
      display: "none",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      flexShrink: "0",
    });
    var headerLogo = el("div", { display: "flex" });
    headerLogo.appendChild(logoElement(36));
    var headerActions = el("div", { display: "flex", gap: "10px", alignItems: "center" });
    var newChatBtn = el("button", {
      padding: "8px 16px",
      borderRadius: "999px",
      border: "none",
      background: settings.brandColor,
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: FONT,
    });
    newChatBtn.type = "button";
    newChatBtn.textContent = "+ New chat";

    function makeCloseButton() {
      var btn = el("button", {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "none",
        background: "rgba(0,0,0,0.06)",
        cursor: "pointer",
        fontSize: "18px",
        lineHeight: "1",
        flexShrink: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
      });
      btn.setAttribute("aria-label", "Close");
      btn.textContent = "✕";
      btn.addEventListener("click", close);
      return btn;
    }

    // Two separate buttons rather than one repositioned button: during the
    // greeting stage it floats alone (no header bar shown yet); once chatting,
    // it needs to sit inline next to "New chat" inside the header's flex row.
    var headerCloseBtn = makeCloseButton();
    header.appendChild(headerLogo);
    header.appendChild(headerActions);
    headerActions.appendChild(newChatBtn);
    headerActions.appendChild(headerCloseBtn);

    var greetingCloseBtn = makeCloseButton();
    Object.assign(greetingCloseBtn.style, { position: "absolute", top: "16px", right: "20px", zIndex: "1" });

    var greetingView = el("div", {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "20px",
      padding: "40px",
    });
    greetingView.appendChild(logoElement(80));
    var headline = el("div", { fontSize: "22px", fontWeight: "700", color: "#1a1a1a", textAlign: "center" });
    headline.textContent = settings.greetingText;
    greetingView.appendChild(headline);

    var greetingForm = el("form", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "min(560px, 100%)",
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: "999px",
      padding: "6px 8px 6px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    });
    var greetingInput = el("input", {
      flex: "1",
      border: "none",
      outline: "none",
      fontSize: "15px",
      fontFamily: FONT,
      minWidth: "0",
    });
    greetingInput.type = "text";
    greetingInput.placeholder = settings.inputPlaceholder;

    var greetingMicBtn = createMicButton(36, function (transcript) {
      greetingInput.value = transcript;
      greetingInput.focus();
    });

    var greetingSendBtn = el("button", {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      border: "none",
      background: settings.brandColor,
      color: "#fff",
      cursor: "pointer",
      fontSize: "16px",
      flexShrink: "0",
    });
    greetingSendBtn.type = "submit";
    greetingSendBtn.textContent = "→";
    greetingForm.appendChild(greetingInput);
    if (greetingMicBtn) greetingForm.appendChild(greetingMicBtn);
    greetingForm.appendChild(greetingSendBtn);
    greetingView.appendChild(greetingForm);

    var thread = buildChatThread({
      padding: "16px 24px",
      hPad: "24px",
      inputPadding: "10px 18px",
      fontSize: "15px",
      micSize: 40,
      maxWidth: "760px",
    });
    thread.root.style.display = "none";

    function showChatView(firstMessage) {
      greetingView.style.display = "none";
      greetingCloseBtn.style.display = "none";
      header.style.display = "flex";
      thread.root.style.display = "flex";
      thread.send(firstMessage);
    }

    greetingForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = greetingInput.value.trim();
      if (!text) return;
      showChatView(text);
    });

    newChatBtn.addEventListener("click", function () {
      clearSessionId();
      thread.reset();
      resetToGreeting();
      greetingInput.focus();
    });

    page.appendChild(greetingCloseBtn);
    page.appendChild(header);
    page.appendChild(greetingView);
    page.appendChild(thread.root);

    function resetToGreeting() {
      thread.root.style.display = "none";
      header.style.display = "none";
      greetingCloseBtn.style.display = "flex";
      greetingView.style.display = "flex";
      greetingInput.value = "";
    }

    function open() {
      page.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (!getSessionId()) {
        resetToGreeting();
      }
      setTimeout(function () {
        (header.style.display === "flex" ? thread.input : greetingInput).focus();
      }, 0);
    }

    function close() {
      page.style.display = "none";
      document.body.style.overflow = "";
    }

    trigger.addEventListener("click", open);

    document.body.appendChild(trigger);
    document.body.appendChild(page);
  }

  function mount() {
    if (settings.launcherStyle === "FULLSCREEN") {
      mountFullscreen();
    } else {
      mountBubble();
    }
  }

  function start() {
    fetch(apiBase + "/api/widget/settings?apiKey=" + encodeURIComponent(apiKey))
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject(new Error("bad settings response"));
      })
      .then(function (data) {
        settings = data;
      })
      .catch(function () {
        // Keep defaults — still functional without fetched settings.
      })
      .finally(function () {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", mount);
        } else {
          mount();
        }
      });
  }

  start();
})();

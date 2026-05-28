const chatbotPagePath = window.location.pathname.toLowerCase();

if (!chatbotPagePath.includes("/admin")) {
  const responses = {
    services: {
      text: "TISATO Transportation Services INC provides private-pay non-emergency medical transportation for Central Florida riders, families, clinics, facilities, and care coordinators. Services include medical appointments, rehabilitation visits, therapy appointments, dialysis transportation, senior transportation, wheelchair transportation, ambulatory transportation, airport drop-offs, community and essential trips, and recurring ride coordination when available.",
      actions: [{ label: "Request transportation", href: "/booking" }]
    },
    booking: {
      text: "You can request a ride through the booking form or call TISATO directly. Helpful trip details include rider name, pickup address, destination address, appointment date and time, one-way or round-trip, ambulatory or wheelchair, assistance needed, phone number, companion rider, and special instructions.",
      actions: [
        { label: "Schedule A Ride", href: "/booking" },
        { label: "Call TISATO", href: "tel:+18448847286" }
      ]
    },
    pricing: {
      text: "Pricing depends on pickup location, destination, timing, wait time, and the level of assistance needed. Ambulatory rides are typically around $75-$90. Wheelchair rides are typically around $90-$125. Additional wait time may be around $20 every extra 30 minutes. Final pricing must be confirmed after reviewing the trip details.",
      actions: [{ label: "Share trip details", href: "/booking" }]
    },
    wheelchair: {
      text: "Yes, wheelchair transportation may be available. Please provide the pickup location, destination, date, time, and level of assistance needed so availability can be confirmed.",
      actions: [{ label: "Request wheelchair ride", href: "/booking" }]
    },
    insurance: {
      text: "TISATO is private-pay at this time. We do not currently bill insurance directly.",
      actions: [{ label: "Ask about pricing", intent: "pricing" }]
    },
    emergency: {
      text: "TISATO provides non-emergency transportation only. If this is a medical emergency, please call 911 immediately."
    },
    hours: {
      text: "TISATO is available 24 Hours / 7 Days A Week. Availability may vary by trip timing, pickup location, destination, and scheduling, so please submit the trip details for confirmation.",
      actions: [{ label: "Schedule A Ride", href: "/booking" }]
    },
    serviceArea: {
      text: "TISATO serves Central Florida and the Orlando area. Availability depends on pickup location, destination, timing, and scheduling.",
      actions: [{ label: "Contact the team", intent: "contact" }]
    },
    contact: {
      text: "You can reach TISATO Transportation Services by phone at (844) 884-7286 or email at info@tisatotransportationservices.com. The mailing address is 4071 LB McLeod Rd, Ste D #220, Orlando, FL 32811.",
      actions: [
        { label: "Call now", href: "tel:+18448847286" },
        { label: "Email TISATO", href: "mailto:info@tisatotransportationservices.com" }
      ]
    },
    sms: {
      text: "By providing a phone number, visitors may consent to receive ride-related SMS messages from TISATO. Message frequency may vary. Message and data rates may apply. Visitors may reply STOP to opt out or HELP for more information. Personal information is not shared with third parties for marketing purposes.",
      actions: [{ label: "Privacy Policy", href: "/privacy-policy" }]
    },
    recurring: {
      text: "Yes, recurring transportation coordination may be available for ongoing appointments such as therapy, dialysis, rehab, or regular medical visits. Share your pickup location, destination, date, time, and mobility needs, and the team can help confirm availability and pricing.",
      actions: [{ label: "Request recurring ride", href: "/booking" }]
    },
    companion: {
      text: "A companion may be able to ride along depending on the trip and vehicle space. Please mention this when booking so the team can confirm the right vehicle and schedule."
    },
    roundTrip: {
      text: "Yes, round trips may be available. Please include the appointment time and expected wait time. Wait time may affect pricing.",
      actions: [{ label: "Book round trip", href: "/booking" }]
    },
    waitTime: {
      text: "Wait time may be available depending on scheduling. Additional wait time may affect pricing, and final pricing must be confirmed after reviewing the trip details."
    },
    fallback: {
      text: "I want to make sure I give you the right information. Please contact TISATO directly or submit your trip details through the booking form, and the team will confirm.",
      actions: [
        { label: "Schedule A Ride", href: "/booking" },
        { label: "Call TISATO", href: "tel:+18448847286" }
      ]
    }
  };

  const quickReplies = [
    { label: "Schedule A Ride", href: "/booking" },
    { label: "Pricing", intent: "pricing" },
    { label: "Service Area", intent: "serviceArea" },
    { label: "Wheelchair Transportation", intent: "wheelchair" },
    { label: "Contact Us", intent: "contact" },
    { label: "24/7 Availability", intent: "hours" },
    { label: "Insurance Questions", intent: "insurance" }
  ];

  const intentRules = [
    { intent: "emergency", words: ["emergency", "911", "ambulance", "urgent", "er"] },
    { intent: "insurance", words: ["insurance", "medicaid", "medicare", "cover", "covered", "claim", "bill"] },
    { intent: "pricing", words: ["price", "pricing", "cost", "rate", "quote", "pay", "private pay", "wait time"] },
    { intent: "wheelchair", words: ["wheelchair", "mobility", "ada", "assist", "transfer"] },
    { intent: "booking", words: ["book", "schedule", "request", "ride", "reservation", "form"] },
    { intent: "services", words: ["service", "doctor", "appointment", "dialysis", "therapy", "rehab", "senior", "airport", "community"] },
    { intent: "serviceArea", words: ["area", "where", "orlando", "central florida", "travel", "distance", "far"] },
    { intent: "hours", words: ["hours", "open", "available", "24", "24/7", "weekend", "night"] },
    { intent: "contact", words: ["contact", "phone", "call", "email", "address", "location"] },
    { intent: "sms", words: ["sms", "text", "privacy", "stop", "help", "message"] },
    { intent: "recurring", words: ["recurring", "repeat", "regular", "weekly", "daily", "ongoing"] },
    { intent: "companion", words: ["companion", "family", "ride along", "passenger"] },
    { intent: "roundTrip", words: ["round trip", "return trip", "return"] },
    { intent: "waitTime", words: ["wait", "waiting"] }
  ];

  const widget = document.createElement("section");
  widget.className = "care-chatbot";
  widget.setAttribute("aria-label", "TISATO Care Assistant");
  widget.innerHTML = `
    <button class="chatbot-launcher" type="button" aria-label="Open TISATO Care Assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 8.5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3.5a4 4 0 0 1-4 4h-3.8L7 19.5V16H9a4 4 0 0 1-4-4Z"></path>
        <path d="M9 10h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M15 10h.01"></path>
      </svg>
    </button>
    <div class="chatbot-panel" role="dialog" aria-modal="false" aria-labelledby="chatbot-title" hidden>
      <div class="chatbot-header">
        <div>
          <p class="overline">TISATO</p>
          <h2 id="chatbot-title">Care Assistant</h2>
        </div>
        <button class="chatbot-close" type="button" aria-label="Close TISATO Care Assistant">Close</button>
      </div>
      <div class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="chatbot-quick-replies" aria-label="Quick questions"></div>
      <form class="chatbot-form">
        <label class="sr-only" for="chatbot-input">Ask TISATO Care Assistant a question</label>
        <input id="chatbot-input" name="question" autocomplete="off" placeholder="Ask about rides, pricing, or booking...">
        <button type="submit" aria-label="Send message">Send</button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  const launcher = widget.querySelector(".chatbot-launcher");
  const panel = widget.querySelector(".chatbot-panel");
  const closeButton = widget.querySelector(".chatbot-close");
  const messages = widget.querySelector(".chatbot-messages");
  const quickReplyContainer = widget.querySelector(".chatbot-quick-replies");
  const form = widget.querySelector(".chatbot-form");
  const input = widget.querySelector("#chatbot-input");

  function createActions(actions = []) {
    if (!actions.length) return null;

    const actionWrap = document.createElement("div");
    actionWrap.className = "chatbot-actions";
    actions.forEach((action) => {
      if (action.href) {
        const link = document.createElement("a");
        link.href = action.href;
        link.textContent = action.label;
        actionWrap.appendChild(link);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => addBotMessage(responses[action.intent] || responses.fallback));
      actionWrap.appendChild(button);
    });

    return actionWrap;
  }

  function addMessage(text, speaker = "bot") {
    const message = document.createElement("article");
    message.className = `chatbot-message ${speaker}`;
    const bubble = document.createElement("div");
    bubble.className = "chatbot-bubble";
    bubble.textContent = text;
    message.appendChild(bubble);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function addBotMessage(response) {
    const message = addMessage(response.text, "bot");
    const actions = createActions(response.actions);
    if (actions) {
      message.querySelector(".chatbot-bubble").appendChild(actions);
    }
  }

  function detectIntent(text) {
    const normalized = String(text || "").toLowerCase();
    const match = intentRules.find((rule) => rule.words.some((word) => normalized.includes(word)));
    return match?.intent || "fallback";
  }

  function renderQuickReplies() {
    quickReplies.forEach((reply) => {
      if (reply.href) {
        const link = document.createElement("a");
        link.href = reply.href;
        link.textContent = reply.label;
        quickReplyContainer.appendChild(link);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = reply.label;
      button.addEventListener("click", () => addBotMessage(responses[reply.intent] || responses.fallback));
      quickReplyContainer.appendChild(button);
    });
  }

  function openChatbot() {
    panel.hidden = false;
    widget.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => input.focus(), 80);
  }

  function closeChatbot() {
    widget.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      panel.hidden = true;
      launcher.focus();
    }, 180);
  }

  launcher.addEventListener("click", () => {
    if (widget.classList.contains("is-open")) {
      closeChatbot();
    } else {
      openChatbot();
    }
  });

  closeButton.addEventListener("click", closeChatbot);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    addMessage(question, "user");
    input.value = "";
    addBotMessage(responses[detectIntent(question)] || responses.fallback);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && widget.classList.contains("is-open")) {
      closeChatbot();
    }
  });

  renderQuickReplies();
  addBotMessage({
    text: "Hi, I am the TISATO Care Assistant. I can help with services, pricing guidance, booking steps, contact details, and common questions. TISATO provides non-emergency transportation only. If this is a medical emergency, please call 911 immediately.",
    actions: [{ label: "Schedule A Ride", href: "/booking" }]
  });
}

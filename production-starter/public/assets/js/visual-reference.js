const stepIds = ["passenger", "trip", "mobility", "review"];
let activeStepIndex = 0;

function setActiveStep(nextIndex) {
  const boundedIndex = Math.max(0, Math.min(stepIds.length - 1, nextIndex));
  activeStepIndex = boundedIndex;
  const activeId = stepIds[activeStepIndex];

  document.querySelectorAll("[data-step-target]").forEach((item) => {
    item.classList.toggle("active", item.dataset.stepTarget === activeId);
  });

  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.stepPanel === activeId);
  });
}

document.querySelectorAll("[data-step-target]").forEach((item, index) => {
  item.addEventListener("click", () => setActiveStep(index));
});

document.querySelector("[data-next-step]")?.addEventListener("click", () => {
  setActiveStep(activeStepIndex + 1);
});

document.querySelector("[data-prev-step]")?.addEventListener("click", () => {
  setActiveStep(activeStepIndex - 1);
});

const bookingPreviewData = {
  maria: {
    name: "Maria Johnson",
    phone: "844-884-7286",
    pickup: "1824 Pine Ridge Drive",
    dropoff: "Central Dialysis Care",
    mobility: "Wheelchair, companion",
    notes: "Passenger needs door-to-door assistance and return trip confirmation.",
  },
  alan: {
    name: "Alan Brooks",
    phone: "407-555-0144",
    pickup: "Lakeview Rehab Center",
    dropoff: "Home address",
    mobility: "Ambulatory",
    notes: "Returning from therapy. Passenger prefers front entrance pickup.",
  },
  patrice: {
    name: "Patrice Miles",
    phone: "407-555-0188",
    pickup: "Adult Day Care Center",
    dropoff: "Family residence",
    mobility: "Round trip, companion",
    notes: "In-progress trip reference. Confirm arrival with family contact.",
  },
};

function updateBookingPreview(key) {
  const preview = bookingPreviewData[key];
  if (!preview) return;

  document.querySelector("[data-preview-name]").textContent = preview.name;
  document.querySelector("[data-preview-phone]").textContent = preview.phone;
  document.querySelector("[data-preview-pickup]").textContent = preview.pickup;
  document.querySelector("[data-preview-dropoff]").textContent = preview.dropoff;
  document.querySelector("[data-preview-mobility]").textContent = preview.mobility;
  document.querySelector("[data-preview-notes]").textContent = preview.notes;
}

document.querySelectorAll("[data-booking-preview]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-booking-preview]")
      .forEach((row) => row.classList.remove("active"));
    button.classList.add("active");
    updateBookingPreview(button.dataset.bookingPreview);
  });
});

document.querySelectorAll("[data-email-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.emailTab;
    document
      .querySelectorAll("[data-email-tab]")
      .forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll("[data-email-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.emailPanel === target);
    });
  });
});

document.querySelectorAll(".choice-card").forEach((button) => {
  button.addEventListener("click", () => button.classList.toggle("active"));
});

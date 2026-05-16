const form = document.getElementById("bookingForm");
const message = document.getElementById("bookingMessage");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function formPayload(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  for (const field of ["returnTrip", "wheelchair", "oxygen", "companion", "stairs", "acceptedTerms"]) {
    data[field] = Boolean(formElement.elements[field]?.checked);
  }
  return data;
}

function formatErrors(errors = {}) {
  const values = Object.values(errors);
  return values.length ? values.join(" ") : "Please check the form and try again.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Submitting request...");

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formPayload(form)),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.error || formatErrors(result.errors), "error");
      return;
    }

    setMessage("Request received. Redirecting...", "success");
    window.location.href = `/thank-you?bookingId=${encodeURIComponent(result.bookingId)}`;
  } catch (error) {
    console.error(error);
    setMessage("The request could not be submitted. Please call dispatch directly.", "error");
  }
});

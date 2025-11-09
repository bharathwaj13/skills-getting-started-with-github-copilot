document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper to avoid HTML injection in participant names/descriptions
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select options (keep the placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Render main activity details
        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Build participants section (no bullets) and attach remove buttons
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        if (details.participants && details.participants.length) {
          const h5 = document.createElement("h5");
          h5.textContent = "Participants";
          participantsDiv.appendChild(h5);

          const ul = document.createElement("ul");

          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "remove-btn";
            btn.type = "button";
            btn.setAttribute("aria-label", `Remove ${p} from ${name}`);
            btn.textContent = "\u2715"; // multiplication X

            // Store activity and email on dataset for handler
            btn.dataset.activity = name;
            btn.dataset.email = p;

            btn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              // Confirm removal
              const ok = confirm(`Unregister ${p} from ${name}?`);
              if (!ok) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                const result = await resp.json().catch(() => ({}));

                if (resp.ok) {
                  // Refresh activities to update UI and availability
                  fetchActivities();
                } else {
                  alert(result.detail || "Failed to remove participant");
                }
              } catch (error) {
                console.error("Error removing participant:", error);
                alert("Error removing participant. See console for details.");
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
        } else {
          participantsDiv.classList.add("empty");
          participantsDiv.innerHTML = "<em>No participants yet.</em>";
        }

        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly registered participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

// Get the save button
const saveButton = document.getElementById("saveBtn");
const viewButton = document.getElementById("viewBtn");
const timestampDisplay = document.getElementById("timestampDisplay");
const timestampList = document.getElementById("timestampList");

// Add click handler
saveButton.addEventListener("click", async () => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Check if we're on YouTube
    if (!tab.url.includes("youtube.com")) {
      displayMessage("Please navigate to a YouTube video first.", "error");
      console.log("Not on YouTube. Current URL:", tab.url);
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "getTimestamp" }, (response) => {
      if (chrome.runtime.lastError) {
        displayMessage(
          "Could not access YouTube page. Try refreshing.",
          "error",
        );
        console.error("Error:", chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        const ts = response.timestamp;
        const message = `Saved: ${ts.formattedTime} / ${ts.formattedDuration}`;
        displayMessage(message, "success");

        console.log("Timestamp captured:", ts);
        console.log(`   URL: ${ts.url}`);
        console.log(`   Title: ${ts.title}`);
        console.log(`   Current Time: ${ts.formattedTime}`);

        // Store timestamp in local storage
        const timestampEntry = {
          ...ts,
          savedAt: new Date().toISOString(),
          id: Date.now(), // unique ID for each entry
        };
        if (!chrome?.storage?.local) {
          console.error("chrome.storage.local unavailable");
          displayMessage("Storage unavailable", "error");
          return;
        }
        chrome.storage.local.get(["savedTimestamps"], (result) => {
          const timestamps = result.savedTimestamps || [];
          timestamps.push(timestampEntry);

          chrome.storage.local.set({ savedTimestamps: timestamps }, () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error saving timestamp:",
                chrome.runtime.lastError,
              );
            } else {
              console.log("Timestamp saved to local storage");
            }
          });
        });
      } else {
        displayMessage(
          `${response?.error || "Failed to capture timestamp"}`,
          "error",
        );
        console.error("Response error:", response?.error);
      }
    });
  } catch (error) {
    displayMessage("Error: " + error.message, "error");
    console.error("Exception:", error);
  }
});

// Add view button handler
viewButton.addEventListener("click", () => {
  displayStoredTimestamps();
});

// Handle delete button clicks
function handleDeleteClick(event) {
  const timestampId = parseInt(event.target.dataset.id);
  deleteTimestamp(timestampId);
}

// Delete a timestamp from storage
function deleteTimestamp(timestampId) {
  chrome.storage.local.get(["savedTimestamps"], (result) => {
    const timestamps = result.savedTimestamps || [];
    const updatedTimestamps = timestamps.filter((ts) => ts.id !== timestampId);

    chrome.storage.local.set({ savedTimestamps: updatedTimestamps }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error deleting timestamp:", chrome.runtime.lastError);
        displayMessage("Failed to delete timestamp", "error");
      } else {
        console.log("Timestamp deleted successfully");
        displayMessage("Timestamp deleted", "success");
        // Refresh the display without toggling visibility
        refreshTimestampList();
      }
    });
  });
}

// Helper function to display stored timestamps
function displayStoredTimestamps() {
  chrome.storage.local.get(["savedTimestamps"], (result) => {
    const timestamps = result.savedTimestamps || [];

    if (timestamps.length === 0) {
      timestampList.innerHTML = "<p>No saved timestamps yet.</p>";
    } else {
      // Sort timestamps in reverse chronological order (newest first)
      const sortedTimestamps = timestamps
        .slice()
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

      const timestampItems = sortedTimestamps
        .map((ts) => {
          // Create URL with timestamp parameter
          const timeInSeconds = ts.timeInSeconds || Math.floor(ts.currentTime); // Use pre-calculated if available, fallback to calculation
          const separator = ts.url.includes("?") ? "&" : "?";
          const timestampUrl = `${ts.url}${separator}t=${timeInSeconds}`;

          return `
        <div class="timestamp-item">
          <button class="delete-btn" data-id="${ts.id}" title="Delete timestamp">×</button>
          <div class="timestamp-time">${ts.formattedTime} / ${ts.formattedDuration}</div>
          <div class="timestamp-title">${ts.title}</div>
          <div class="timestamp-url"><a href="${timestampUrl}" target="_blank">${ts.url}</a></div>
          <div class="timestamp-saved">Saved: ${new Date(ts.savedAt).toLocaleString()}</div>
        </div>
      `;
        })
        .join("");

      timestampList.innerHTML = timestampItems;

      // Add event listeners for delete buttons
      const deleteButtons = timestampList.querySelectorAll(".delete-btn");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", handleDeleteClick);
      });
    }

    // Toggle visibility
    timestampList.style.display =
      timestampList.style.display === "none" ? "block" : "none";
    timestampDisplay.textContent = ""; // Clear any current message
  });
}

// Helper function to refresh timestamp list without toggling visibility
function refreshTimestampList() {
  chrome.storage.local.get(["savedTimestamps"], (result) => {
    const timestamps = result.savedTimestamps || [];

    if (timestamps.length === 0) {
      timestampList.innerHTML = "<p>No saved timestamps yet.</p>";
    } else {
      // Sort timestamps in reverse chronological order (newest first)
      const sortedTimestamps = timestamps
        .slice()
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

      const timestampItems = sortedTimestamps
        .map((ts) => {
          // Create URL with timestamp parameter
          const timeInSeconds = ts.timeInSeconds || Math.floor(ts.currentTime); // Use pre-calculated if available, fallback to calculation
          const separator = ts.url.includes("?") ? "&" : "?";
          const timestampUrl = `${ts.url}${separator}t=${timeInSeconds}`;

          return `
        <div class="timestamp-item">
          <button class="delete-btn" data-id="${ts.id}" title="Delete timestamp">×</button>
          <div class="timestamp-time">${ts.formattedTime} / ${ts.formattedDuration}</div>
          <div class="timestamp-title">${ts.title}</div>
          <div class="timestamp-url"><a href="${timestampUrl}" target="_blank">${ts.url}</a></div>
          <div class="timestamp-saved">Saved: ${new Date(ts.savedAt).toLocaleString()}</div>
        </div>
      `;
        })
        .join("");

      timestampList.innerHTML = timestampItems;

      // Add event listeners for delete buttons
      const deleteButtons = timestampList.querySelectorAll(".delete-btn");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", handleDeleteClick);
      });
    }

    // Note: No visibility toggle here - just refresh content
  });
}

// Helper function to display messages
function displayMessage(message, type) {
  timestampDisplay.textContent = message;
  timestampDisplay.className = "message " + type;

  // Clear message after 4 seconds
  setTimeout(() => {
    timestampDisplay.textContent = "";
    timestampDisplay.className = "message";
  }, 4000);
}

// Enable/disable button based on current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url && tab.url.includes("youtube.com")) {
    saveButton.disabled = false;
  } else {
    saveButton.disabled = true;
    displayMessage("Navigate to YouTube to use this extension", "info");
  }
});

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

          // Check if video already exists
          const isUpdate = timestamps.some((t) => t.videoId === ts.videoId);

          // Filter out any existing entry for this video ID
          const updatedTimestamps = timestamps.filter(
            (t) => t.videoId !== ts.videoId,
          );

          // Add the new/updated entry
          updatedTimestamps.push(timestampEntry);

          chrome.storage.local.set(
            { savedTimestamps: updatedTimestamps },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error saving timestamp:",
                  chrome.runtime.lastError,
                );
                displayMessage("Failed to save timestamp", "error");
              } else {
                const successMsg = isUpdate
                  ? "Timestamp Updated!"
                  : "Timestamp Saved!";
                displayMessage(successMsg, "success");
                console.log(
                  isUpdate
                    ? "Timestamp updated"
                    : "Timestamp saved to local storage",
                );
              }
            },
          );
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
  renderTimestamps(true);
});

// Helper function to remove existing timestamp parameter from URL
function removeExistingTimestampParam(url) {
  // Split at ? to get base URL and query string
  const [baseUrl, queryString] = url.split("?");

  if (!queryString) {
    return url; // No query string, return as is
  }

  // Split query string by & and filter out t parameter
  const params = queryString
    .split("&")
    .filter((param) => !param.startsWith("t="));

  // Reconstruct URL
  return params.length > 0 ? baseUrl + "?" + params.join("&") : baseUrl;
}

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
        renderTimestamps(false);
      }
    });
  });
}

/**
 * Renders the stored timestamps in the UI.
 * @param {boolean} toggleVisibility - If true, toggles the display of the list.
 */
function renderTimestamps(toggleVisibility = false) {
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
          const timeInSeconds = Math.floor(ts.currentTime);
          const cleanUrl = removeExistingTimestampParam(ts.url);
          const separator = cleanUrl.includes("?") ? "&" : "?";
          const timestampUrl = `${cleanUrl}${separator}t=${timeInSeconds}`;

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

    if (toggleVisibility) {
      timestampList.style.display =
        timestampList.style.display === "none" ? "block" : "none";
      timestampDisplay.textContent = ""; // Clear any current message
    }
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

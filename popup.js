// Get the save button
const saveButton = document.getElementById("saveBtn");
const timestampDisplay = document.getElementById("timestampDisplay");
const timestampList = document.getElementById("timestampList");

// Render timestamps on load
renderTimestamps();

// Add click handler
saveButton.addEventListener("click", async () => {
  try {
    // Send message to background script to trigger the save process
    chrome.runtime.sendMessage(
      { action: "saveTimestampFromPopup" },
      (response) => {
        if (chrome.runtime.lastError) {
          displayMessage(
            "Could not communicate with background script.",
            "error",
          );
          console.error("Error:", chrome.runtime.lastError);
          return;
        }
      },
    );
  } catch (error) {
    displayMessage("Error: " + error.message, "error");
    console.error("Exception:", error);
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "timestampSaved") {
    // Refresh the list
    renderTimestamps();
  }
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
        // Refresh the display
        renderTimestamps();
      }
    });
  });
}

// Helper function to format date as DD/MM/YY HH:MM (24h)
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Renders the stored timestamps in the UI.
 */
function renderTimestamps() {
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

          // Fallback for thumbnailUrl if it doesn't exist (for older saved timestamps)
          const thumbUrl = ts.thumbnailUrl || (ts.videoId ? `https://img.youtube.com/vi/${ts.videoId}/mqdefault.jpg` : null);

          return `
        <div class="timestamp-item" data-url="${timestampUrl}">
          <button class="delete-btn" data-id="${ts.id}" title="Delete timestamp">×</button>
          ${thumbUrl ? `<img src="${thumbUrl}" class="timestamp-thumbnail" alt="Video thumbnail">` : ""}
          <div class="timestamp-info">
            <div class="timestamp-title">${ts.title}</div>
            <div class="timestamp-time">${ts.formattedTime} / ${ts.formattedDuration}</div>
            <div class="timestamp-saved">Saved: ${formatDate(ts.savedAt)}</div>
          </div>
        </div>
      `;
        })
        .join("");

      timestampList.innerHTML = timestampItems;

      // Add event listeners for delete buttons
      const deleteButtons = timestampList.querySelectorAll(".delete-btn");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation(); // Prevent tile click from triggering
          handleDeleteClick(event);
        });
      });

      // Add event listeners for entire timestamp tiles
      const items = timestampList.querySelectorAll(".timestamp-item");
      items.forEach((item) => {
        item.addEventListener("click", (event) => {
          const url = item.dataset.url;
          if (url) {
            chrome.tabs.create({ url: url });
          }
        });
      });
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
  }
});

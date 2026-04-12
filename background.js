// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "save-timestamp") {
    handleSaveTimestamp();
  }
});

// Function to handle the save timestamp logic
async function handleSaveTimestamp() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Verify it's a YouTube tab
    if (!tab || !tab.url || !tab.url.includes("youtube.com")) {
      console.log("Not a YouTube tab or no active tab found.");
      return;
    }

    // Request timestamp from content script
    chrome.tabs.sendMessage(tab.id, { action: "getTimestamp" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error communicating with content script. Please refresh the YouTube page.",
          chrome.runtime.lastError
        );
        return;
      }

      if (response && response.success) {
        saveToStorage(response.timestamp, tab.id);
      } else {
        console.error("Failed to capture timestamp:", response?.error);
      }
    });
  } catch (error) {
    console.error("Error in background script:", error);
  }
}

// Function to save timestamp to local storage
function saveToStorage(ts, tabId) {
  const timestampEntry = {
    ...ts,
    savedAt: new Date().toISOString(),
    id: Date.now(),
  };

  chrome.storage.local.get(["savedTimestamps"], (result) => {
    const timestamps = result.savedTimestamps || [];

    // Check if it's an update (same videoId)
    const isUpdate = timestamps.some((t) => t.videoId === ts.videoId);

    // Filter and push logic for duplicate prevention
    const updatedTimestamps = timestamps.filter(
      (t) => t.videoId !== ts.videoId,
    );
    updatedTimestamps.push(timestampEntry);

    chrome.storage.local.set({ savedTimestamps: updatedTimestamps }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        const message = isUpdate ? "Timestamp Updated!" : "Timestamp Saved!";
        console.log(message);

        // Notify content script to show visual feedback (Toast)
        chrome.tabs.sendMessage(tabId, {
          action: "showToast",
          text: `${message} (${ts.formattedTime})`,
          type: "success",
        });

        // Notify popup to refresh its list if it's open
        chrome.runtime.sendMessage({ action: "timestampSaved" }).catch(() => {
          // Ignore error if popup is not open
        });
      }
    });
  });
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveTimestampFromPopup") {
    handleSaveTimestamp();
    sendResponse({ status: "processing" });
  }
  return true;
});

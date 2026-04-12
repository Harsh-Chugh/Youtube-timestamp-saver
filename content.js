// Function to extract YouTube Video ID
function getVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    const params = new URLSearchParams(urlObj.search);
    return params.get("v");
  } catch (e) {
    return null;
  }
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTimestamp") {
    try {
      // Get the video element on YouTube
      const video = document.querySelector("video");

      if (!video) {
        console.error("No video element found on this page");
        sendResponse({
          success: false,
          error:
            "No video element found. Make sure you're on a YouTube video page.",
        });
        return;
      }

      // Get current time and duration in seconds
      const currentTime = video.currentTime;
      const duration = video.duration;

      // Format time as MM:SS
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

      const videoId = getVideoId(window.location.href);

      const timestamp = {
        videoId: videoId,
        currentTime: currentTime,
        formattedTime: formatTime(currentTime),
        duration: duration,
        formattedDuration: formatTime(duration),
        url: window.location.href,
        title: document.title,
      };

      console.log("YouTube Timestamp Saved:", timestamp);

      sendResponse({
        success: true,
        timestamp: timestamp,
      });
    } catch (error) {
      console.error("Error capturing timestamp:", error);
      sendResponse({
        success: false,
        error: error.message,
      });
    }
  } else if (request.action === "showToast") {
    showToast(request.text, request.type);
    sendResponse({ success: true });
  }
});

// Function to show a toast notification on the page
function showToast(message, type = "success") {
  // Remove existing toast if any
  const existingToast = document.getElementById("yt-timestamp-saver-toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.id = "yt-timestamp-saver-toast";
  toast.className = `yt-timestamp-saver-toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

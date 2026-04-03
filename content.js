// Listen for messages from the popup
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

      const timestamp = {
        currentTime: currentTime,
        timeInSeconds: Math.floor(currentTime), // Add integer seconds for URL
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
  }
});

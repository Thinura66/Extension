// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight") {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.backgroundColor = "yellow";
    span.className = "highlighted-text";
    range.surroundContents(span);

    // Save highlight to localStorage
    const highlight = {
      text: selection.toString(),
      url: window.location.href
    };

    chrome.storage.local.get(["highlights"], (result) => {
      const highlights = result.highlights || [];
      highlights.push(highlight);
      chrome.storage.local.set({ highlights });
    });

    sendResponse({ success: true });
  }
});

// Minimal test content script - no CSS injection, no modifications
console.log('Test extension loaded - no page modifications');

// Only respond to messages, don't modify anything on load
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight") {
    console.log('Highlight request received');
    sendResponse({ success: true, message: 'Test mode - no highlighting' });
  }
});
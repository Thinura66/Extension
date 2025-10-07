// API Configuration - Update this with your actual Vercel deployment URL
const API_BASE_URL = 'https://extension-sable.vercel.app/api';

// Generate a simple user ID (you can make this more sophisticated)
const getUserId = () => {
  return chrome.runtime.id || 'anonymous-user';
};

// Save highlight to backend API
async function saveHighlight(text, url, color = 'yellow') {
  try {
    const response = await fetch(`${API_BASE_URL}/highlights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: getUserId(),
        url: url,
        text: text,
        color: color
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving highlight:', error);
    // Fallback to local storage if API fails
    chrome.storage.local.get(['highlights'], (result) => {
      const highlights = result.highlights || [];
      highlights.push({ text, url, color, createdAt: new Date().toISOString() });
      chrome.storage.local.set({ highlights });
    });
    throw error;
  }
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight") {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      sendResponse({ success: false, error: 'No text selected' });
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.backgroundColor = request.color || "yellow";
    span.className = "highlighted-text";
    span.setAttribute('data-highlight-id', Date.now().toString());
    
    try {
      range.surroundContents(span);
    } catch (error) {
      // If surroundContents fails, use a different approach
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }

    // Save highlight to backend API
    saveHighlight(
      selection.toString(),
      window.location.href,
      request.color || 'yellow'
    ).then((savedHighlight) => {
      span.setAttribute('data-highlight-id', savedHighlight._id);
      sendResponse({ success: true, highlightId: savedHighlight._id });
    }).catch((error) => {
      console.error('Failed to save highlight:', error);
      sendResponse({ success: true, error: 'Saved locally only' });
    });

    return true; // Keep the message channel open for async response
  }
  
  if (request.action === "loadHighlights") {
    loadPageHighlights().then((highlights) => {
      sendResponse({ success: true, highlights });
    }).catch((error) => {
      console.error('Failed to load highlights:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Load highlights for current page
async function loadPageHighlights() {
  try {
    const response = await fetch(`${API_BASE_URL}/highlights?userId=${getUserId()}&url=${encodeURIComponent(window.location.href)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading highlights:', error);
    // Fallback to local storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['highlights'], (result) => {
        const highlights = result.highlights || [];
        const pageHighlights = highlights.filter(h => h.url === window.location.href);
        resolve(pageHighlights);
      });
    });
  }
}

// Load and display existing highlights when page loads
window.addEventListener('load', async () => {
  try {
    const highlights = await loadPageHighlights();
    // You can implement logic here to re-highlight existing text
    // This would require storing position information with highlights
  } catch (error) {
    console.error('Failed to load page highlights:', error);
  }
});

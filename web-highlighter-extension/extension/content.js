// API Configuration - Update this with your actual Vercel deployment URL
const API_BASE_URL = 'https://extension-91zzxab0y-kahaduwasenitha-gmailcoms-projects.vercel.app/api';

// Content script loaded indicator
console.log('Web Highlighter content script loaded on:', window.location.href);

// Generate a simple user ID (you can make this more sophisticated)
const getUserId = () => {
  return chrome.runtime.id || 'anonymous-user';
};

// Save highlight to local storage (with API backup)
async function saveHighlight(text, url, color = 'yellow') {
  const highlightData = {
    id: Date.now().toString(),
    text: text,
    url: url,
    color: color,
    createdAt: new Date().toISOString(),
    userId: getUserId()
  };

  // Always save to local storage first
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['highlights'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        reject(new Error('Storage error'));
        return;
      }

      const highlights = result.highlights || [];
      highlights.push(highlightData);
      
      chrome.storage.local.set({ highlights }, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage set error:', chrome.runtime.lastError);
          reject(new Error('Storage set error'));
          return;
        }
        
        console.log('Highlight saved to local storage:', highlightData);
        resolve(highlightData);
        
        // Try to sync with API in background (don't wait for it)
        syncWithAPI(highlightData).catch(err => {
          console.log('API sync failed (not critical):', err.message);
        });
      });
    });
  });
}

// Background sync with API (non-blocking)
async function syncWithAPI(highlightData) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${API_BASE_URL}/highlights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(highlightData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('Successfully synced with API');
    }
  } catch (error) {
    console.log('API sync failed:', error.message);
  }
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "highlight") {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim() === '') {
      sendResponse({ success: false, error: 'Please select text to highlight' });
      return false;
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

    // Save highlight to local storage
    saveHighlight(
      selection.toString(),
      window.location.href,
      request.color || 'yellow'
    ).then((savedHighlight) => {
      if (savedHighlight.id) {
        span.setAttribute('data-highlight-id', savedHighlight.id);
      }
      console.log('Highlight saved successfully:', savedHighlight);
      sendResponse({ success: true, highlightId: savedHighlight.id });
    }).catch((error) => {
      console.error('Failed to save highlight:', error);
      sendResponse({ success: false, error: 'Failed to save highlight' });
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

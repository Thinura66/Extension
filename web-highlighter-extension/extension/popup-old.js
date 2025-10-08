// API Configuration - Update this with your actual Vercel deployment URL
const API_BASE_URL = 'https://extension-91zzxab0y-kahaduwasenitha-gmailcoms-projects.vercel.app/api';


// Generate a simple user ID (you can make this more sophisticated)
const getUserId = () => {
  return chrome.runtime.id || 'anonymous-user';
};

// Get current tab URL
async function getCurrentTabUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0].url);
    });
  });
}

// Highlight button event listener
document.getElementById("highlightBtn").addEventListener("click", async () => {
  const colorSelect = document.getElementById("colorSelect");
  const selectedColor = colorSelect ? colorSelect.value : 'yellow';
  
  try {
    const tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });

    if (!tabs || tabs.length === 0) {
      showStatus('No active tab found', 'error');
      return;
    }

    const activeTab = tabs[0];
    
    // Check if we can access this tab (some tabs like chrome:// pages are restricted)
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:')) {
      showStatus('Cannot highlight on this page', 'warning');
      return;
    }

    // Inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      });
    } catch (injectionError) {
      console.log('Content script might already be injected:', injectionError.message);
    }

    // Send message to content script
    chrome.tabs.sendMessage(activeTab.id, { 
      action: "highlight",
      color: selectedColor 
    }, (response) => {
      // Clear any previous runtime errors
      if (chrome.runtime.lastError) {
        console.error('Message sending error:', chrome.runtime.lastError.message);
        
        // Fallback: Try to execute highlighting directly
        try {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              const selection = window.getSelection();
              if (selection.rangeCount > 0 && selection.toString().trim() !== '') {
                const range = selection.getRangeAt(0);
                const span = document.createElement("span");
                span.style.backgroundColor = "yellow";
                span.className = "highlighted-text";
                range.surroundContents(span);
                return { success: true, text: selection.toString() };
              }
              return { success: false, error: 'No text selected' };
            }
          }, (results) => {
            if (results && results[0] && results[0].result) {
              const result = results[0].result;
              if (result.success) {
                // Save to local storage directly
                chrome.storage.local.get(['highlights'], (storageResult) => {
                  const highlights = storageResult.highlights || [];
                  highlights.push({
                    id: Date.now().toString(),
                    text: result.text,
                    url: activeTab.url,
                    color: selectedColor,
                    createdAt: new Date().toISOString()
                  });
                  chrome.storage.local.set({ highlights }, () => {
                    loadHighlights();
                    showStatus('Highlight saved!', 'success');
                  });
                });
              } else {
                showStatus(result.error, 'warning');
              }
            } else {
              showStatus('Please select text to highlight', 'warning');
            }
          });
        } catch (fallbackError) {
          console.error('Fallback highlighting failed:', fallbackError);
          showStatus('Cannot highlight on this page', 'error');
        }
        return;
      }

      if (response && response.success) {
        loadHighlights();
        showStatus('Highlight saved!', 'success');
      } else if (response && response.error) {
        showStatus(response.error, 'warning');
      } else {
        showStatus('Please select text to highlight', 'warning');
      }
    });

  } catch (error) {
    console.error('Highlighting error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
});

// Load highlights from API with robust fallback
async function loadHighlights() {
  try {
    const currentUrl = await getCurrentTabUrl();
    
    // Try API first (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/highlights?userId=${getUserId()}&url=${encodeURIComponent(currentUrl)}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const highlights = await response.json();
    displayHighlights(highlights);
    showStatus('Highlights loaded from server', 'success');
    
  } catch (error) {
    console.log('API unavailable, using local storage:', error.message);
    
    // Fallback to local storage
    try {
      const currentUrl = await getCurrentTabUrl();
      chrome.storage.local.get(["highlights"], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError);
          displayHighlights([]);
          showStatus('Error loading highlights', 'error');
          return;
        }
        
        const allHighlights = result.highlights || [];
        const pageHighlights = allHighlights.filter(h => h.url === currentUrl);
        displayHighlights(pageHighlights);
        
        if (pageHighlights.length > 0) {
          showStatus('Loaded offline highlights', 'warning');
        } else {
          showStatus('No highlights found', 'info');
        }
      });
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      displayHighlights([]);
      showStatus('Error loading highlights', 'error');
    }
  }
}

// Display highlights in the popup
function displayHighlights(highlights) {
  const list = document.getElementById("highlightList");
  list.innerHTML = "";
  
  if (highlights.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No highlights found for this page";
    li.style.fontStyle = "italic";
    li.style.color = "#666";
    list.appendChild(li);
    return;
  }
  
  highlights.forEach((item) => {
    const li = document.createElement("li");
    li.className = "highlight-item";
    
    const textSpan = document.createElement("span");
    textSpan.textContent = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
    textSpan.style.backgroundColor = item.color || 'yellow';
    textSpan.style.padding = '2px 4px';
    textSpan.style.borderRadius = '3px';
    textSpan.style.marginRight = '8px';
    
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.className = "delete-btn";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.style.background = "#ff4444";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "3px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.padding = "2px 6px";
    
    deleteBtn.addEventListener("click", () => deleteHighlight(item._id || item.id, li));
    
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// Delete highlight
async function deleteHighlight(highlightId, listItem) {
  try {
    // Delete from local storage first
    chrome.storage.local.get(['highlights'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        showStatus('Failed to delete highlight', 'error');
        return;
      }

      const highlights = result.highlights || [];
      const updatedHighlights = highlights.filter(h => h.id !== highlightId && h._id !== highlightId);
      
      chrome.storage.local.set({ highlights: updatedHighlights }, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage set error:', chrome.runtime.lastError);
          showStatus('Failed to delete highlight', 'error');
          return;
        }
        
        listItem.remove();
        showStatus('Highlight deleted!', 'success');
        
        // Try to delete from API in background (non-blocking)
        if (highlightId) {
          deleteFromAPI(highlightId).catch(err => {
            console.log('API delete failed (not critical):', err.message);
          });
        }
      });
    });
    
  } catch (error) {
    console.error('Error deleting highlight:', error);
    showStatus('Failed to delete highlight', 'error');
  }
}

// Background delete from API (non-blocking)
async function deleteFromAPI(highlightId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${API_BASE_URL}/highlights?id=${highlightId}`, {
      method: 'DELETE',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('Successfully deleted from API');
    }
  } catch (error) {
    console.log('API delete failed:', error.message);
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status') || createStatusDiv();
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Create status div if it doesn't exist
function createStatusDiv() {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'status';
  statusDiv.style.cssText = `
    padding: 8px;
    margin: 8px 0;
    border-radius: 4px;
    text-align: center;
    font-size: 12px;
    display: none;
  `;
  document.body.insertBefore(statusDiv, document.body.firstChild);
  return statusDiv;
}

// Load highlights on popup open
document.addEventListener("DOMContentLoaded", () => {
  loadHighlights();
  
  // Add color selector if it doesn't exist
  const colorSelect = document.getElementById("colorSelect");
  if (!colorSelect && document.getElementById("highlightBtn")) {
    const select = document.createElement("select");
    select.id = "colorSelect";
    select.style.marginLeft = "8px";
    select.innerHTML = `
      <option value="yellow">Yellow</option>
      <option value="lightgreen">Green</option>
      <option value="lightblue">Blue</option>
      <option value="lightpink">Pink</option>
      <option value="lightcoral">Orange</option>
    `;
    document.getElementById("highlightBtn").parentNode.appendChild(select);
  }
});

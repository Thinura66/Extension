// API Configuration - Update this with your actual Vercel deployment URL
const API_BASE_URL = 'https://extension-sable.vercel.app/api';

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
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      action: "highlight",
      color: selectedColor 
    }, (response) => {
      if (response && response.success) {
        loadHighlights();
        showStatus('Highlight saved!', 'success');
      } else {
        showStatus('Failed to highlight', 'error');
      }
    });
  });
});

// Load highlights from API
async function loadHighlights() {
  try {
    const currentUrl = await getCurrentTabUrl();
    const response = await fetch(`${API_BASE_URL}/highlights?userId=${getUserId()}&url=${encodeURIComponent(currentUrl)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const highlights = await response.json();
    displayHighlights(highlights);
    
  } catch (error) {
    console.error('Error loading highlights:', error);
    // Fallback to local storage
    chrome.storage.local.get(["highlights"], (result) => {
      const allHighlights = result.highlights || [];
      getCurrentTabUrl().then(currentUrl => {
        const pageHighlights = allHighlights.filter(h => h.url === currentUrl);
        displayHighlights(pageHighlights);
      });
    });
    showStatus('Using offline highlights', 'warning');
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
    const response = await fetch(`${API_BASE_URL}/highlights?id=${highlightId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    listItem.remove();
    showStatus('Highlight deleted!', 'success');
    
  } catch (error) {
    console.error('Error deleting highlight:', error);
    showStatus('Failed to delete highlight', 'error');
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

// Track selected highlights
let selectedHighlights = new Set();

// Generate a simple user ID for local storage organization
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

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status-message show ${type}`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Display highlights in the popup
function displayHighlights(highlights) {
  const list = document.getElementById("highlightList");
  const emptyState = document.getElementById("emptyState");
  const countEl = document.getElementById("highlightCount");
  
  // Update counter
  countEl.textContent = highlights.length;
  
  // Clear existing highlights
  list.innerHTML = "";
  
  if (highlights.length === 0) {
    emptyState.style.display = "block";
    list.style.display = "none";
    return;
  }
  
  emptyState.style.display = "none";
  list.style.display = "block";
  
  highlights.forEach((highlight) => {
    const li = document.createElement("li");
    li.className = "highlight-item";
    li.setAttribute("data-highlight-id", highlight.id);
    
    // Add selection functionality
    li.addEventListener("click", (e) => {
      // Don't trigger if clicking on action buttons
      if (e.target.closest('.highlight-actions')) return;
      
      toggleHighlightSelection(highlight.id, li);
    });
    
    // Content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "highlight-content";
    
    // Highlight text
    const textDiv = document.createElement("div");
    textDiv.className = "highlight-text";
    textDiv.textContent = highlight.text;
    
    // Meta information
    const metaDiv = document.createElement("div");
    metaDiv.className = "highlight-meta";
    
    const dateSpan = document.createElement("span");
    const date = new Date(highlight.createdAt);
    dateSpan.textContent = date.toLocaleDateString();
    
    metaDiv.appendChild(dateSpan);
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(metaDiv);
    
    // Actions container
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "highlight-actions";
    
    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "action-btn copy";
    copyBtn.textContent = "Copy";
    copyBtn.title = "Copy text to clipboard";
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyToClipboard(highlight.text, copyBtn);
    });
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.title = "Delete highlight";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteHighlight(highlight.id, highlight.text);
    });
    
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(deleteBtn);
    
    li.appendChild(contentDiv);
    li.appendChild(actionsDiv);
    list.appendChild(li);
  });
}

// Toggle highlight selection
function toggleHighlightSelection(highlightId, listItem) {
  if (selectedHighlights.has(highlightId)) {
    selectedHighlights.delete(highlightId);
    listItem.classList.remove('selected');
  } else {
    selectedHighlights.add(highlightId);
    listItem.classList.add('selected');
  }
  
  updateSelectionUI();
}

// Update UI based on selection
function updateSelectionUI() {
  const selectedCount = selectedHighlights.size;
  const exportBtn = document.getElementById("exportBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  
  if (selectedCount > 0) {
    exportBtn.textContent = `Export Selected (${selectedCount})`;
    clearAllBtn.textContent = `Delete Selected (${selectedCount})`;
  } else {
    exportBtn.textContent = "Export All Highlights";
    clearAllBtn.textContent = "Clear All Highlights";
  }
}

// Select all highlights
function selectAllHighlights() {
  const highlightItems = document.querySelectorAll('.highlight-item');
  highlightItems.forEach(item => {
    const highlightId = item.getAttribute('data-highlight-id');
    if (highlightId && !selectedHighlights.has(highlightId)) {
      selectedHighlights.add(highlightId);
      item.classList.add('selected');
    }
  });
  updateSelectionUI();
}

// Deselect all highlights
function deselectAllHighlights() {
  selectedHighlights.clear();
  const highlightItems = document.querySelectorAll('.highlight-item');
  highlightItems.forEach(item => {
    item.classList.remove('selected');
  });
  updateSelectionUI();
}

// Load highlights from local storage
async function loadHighlights() {
  try {
    const currentUrl = await getCurrentTabUrl();
    chrome.storage.local.get(["highlights"], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        showStatus('Error loading highlights', 'error');
        return;
      }
      
      const allHighlights = result.highlights || [];
      const pageHighlights = allHighlights.filter(h => h.url === currentUrl);
      displayHighlights(pageHighlights);
      updateSelectionUI();
      
      if (pageHighlights.length > 0) {
        showStatus(`Loaded ${pageHighlights.length} highlights`, 'success');
      }
    });
  } catch (error) {
    console.error('Error loading highlights:', error);
    showStatus('Error loading highlights', 'error');
  }
}

// Delete highlight
function deleteHighlight(highlightId, text) {
  const confirmText = text.length > 50 ? text.substring(0, 50) + '...' : text;
  if (!confirm(`Delete this highlight?\n\n"${confirmText}"`)) {
    return;
  }
  
  chrome.storage.local.get(['highlights'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Chrome storage error:', chrome.runtime.lastError);
      showStatus('Failed to delete highlight', 'error');
      return;
    }
    
    const highlights = result.highlights || [];
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    
    chrome.storage.local.set({ highlights: updatedHighlights }, () => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage set error:', chrome.runtime.lastError);
        showStatus('Failed to delete highlight', 'error');
        return;
      }
      
      loadHighlights();
      showStatus('Highlight deleted', 'success');
    });
  });
}

// Copy to clipboard
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#28a745';
    button.style.color = 'white';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.style.color = '';
    }, 1500);
    
    showStatus('Text copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showStatus('Failed to copy text', 'error');
  });
}

// Clear all highlights or selected highlights
function clearAllHighlights() {
  if (selectedHighlights.size > 0) {
    // Delete selected highlights
    const selectedCount = selectedHighlights.size;
    if (!confirm(`Are you sure you want to delete ${selectedCount} selected highlight${selectedCount > 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }
    
    chrome.storage.local.get(['highlights'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        showStatus('Failed to delete highlights', 'error');
        return;
      }
      
      const highlights = result.highlights || [];
      const updatedHighlights = highlights.filter(h => !selectedHighlights.has(h.id));
      
      chrome.storage.local.set({ highlights: updatedHighlights }, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage set error:', chrome.runtime.lastError);
          showStatus('Failed to delete highlights', 'error');
          return;
        }
        
        selectedHighlights.clear();
        loadHighlights();
        showStatus(`${selectedCount} highlight${selectedCount > 1 ? 's' : ''} deleted`, 'success');
      });
    });
  } else {
    // Delete all highlights
    if (!confirm('Are you sure you want to delete ALL highlights? This cannot be undone.')) {
      return;
    }
    
    chrome.storage.local.set({ highlights: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage set error:', chrome.runtime.lastError);
        showStatus('Failed to clear highlights', 'error');
        return;
      }
      
      selectedHighlights.clear();
      loadHighlights();
      showStatus('All highlights cleared', 'success');
    });
  }
}

// Export highlights
function exportHighlights() {
  chrome.storage.local.get(['highlights'], (result) => {
    const allHighlights = result.highlights || [];
    if (allHighlights.length === 0) {
      showStatus('No highlights to export', 'warning');
      return;
    }
    
    // Filter highlights based on selection
    let highlightsToExport;
    if (selectedHighlights.size > 0) {
      highlightsToExport = allHighlights.filter(h => selectedHighlights.has(h.id));
      if (highlightsToExport.length === 0) {
        showStatus('No selected highlights to export', 'warning');
        return;
      }
    } else {
      highlightsToExport = allHighlights;
    }
    
    // Create formatted text content
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const exportType = selectedHighlights.size > 0 ? 'Selected ' : '';
    
    let textContent = `Web Highlighter - Exported ${exportType}Highlights (${dateStr})\n`;
    textContent += '============================================================\n\n';
    
    highlightsToExport.forEach((highlight, index) => {
      const date = new Date(highlight.createdAt);
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      const formattedTime = date.toLocaleTimeString();
      
      textContent += `${index + 1}. ${highlight.text}\n`;
      textContent += `   Date: ${formattedDate}, ${formattedTime}\n\n`;
    });
    
    // Create and download the text file
    const dataBlob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Web-Highlighter-Exported-Highlights-${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}.txt`;
    link.click();
    
    URL.revokeObjectURL(url);
    showStatus('Highlights exported successfully', 'success');
  });
}



// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load existing highlights
  loadHighlights();
  
  // Highlight button event listener
  document.getElementById("highlightBtn").addEventListener("click", async () => {
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
      
      // Check if we can access this tab
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
        color: "yellow" 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending error:', chrome.runtime.lastError.message);
          showStatus('Error highlighting text. Please select text first.', 'error');
          return;
        }

        if (response && response.success) {
          loadHighlights();
          showStatus('Text highlighted successfully!', 'success');
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
  
  // Clear all button
  document.getElementById("clearAllBtn").addEventListener("click", clearAllHighlights);
  
  // Export button
  document.getElementById("exportBtn").addEventListener("click", exportHighlights);
  
  // Selection control buttons
  document.getElementById("selectAllBtn").addEventListener("click", selectAllHighlights);
  document.getElementById("deselectAllBtn").addEventListener("click", deselectAllHighlights);
  
});
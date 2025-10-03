document.getElementById("highlightBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "highlight" }, (response) => {
      if (response && response.success) {
        loadHighlights();
      }
    });
  });
});

function loadHighlights() {
  chrome.storage.local.get(["highlights"], (result) => {
    const list = document.getElementById("highlightList");
    list.innerHTML = "";
    (result.highlights || []).forEach((item, index) => {
      const li = document.createElement("li");
      li.textContent = `${item.text} (${item.url})`;
      list.appendChild(li);
    });
  });
}

// Load highlights on popup open
document.addEventListener("DOMContentLoaded", loadHighlights);

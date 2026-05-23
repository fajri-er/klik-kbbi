chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cariKBBI",
    title: "Cari definisi '%s' di KBBI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "cariKBBI") {
    chrome.tabs.sendMessage(tab.id, {
      action: "CONTEXT_SEARCH",
      word: info.selectionText
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_HTML") {
    // Menggunakan domain baru Kemendikdasmen
    const url = `https://kbbi.kemendikdasmen.go.id/entri/${encodeURIComponent(request.word)}`;
    
    fetch(url)
      .then(response => response.text())
      .then(html => sendResponse({ success: true, html: html }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; 
  }
});
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get({
        enableAutoRefresh: true
    }, (items) => {
        document.getElementById('enableAutoRefresh').checked = items.enableAutoRefresh;
    });

    // Handle toggle changes
    document.getElementById('enableAutoRefresh').addEventListener('change', (e) => {
        chrome.storage.sync.set({
            enableAutoRefresh: e.target.checked
        });
    });

    // Open settings page
    document.getElementById('openSettings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open README page
    document.getElementById('openReadme').addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('readme.html') + '?source=popup'
        });
    });
});

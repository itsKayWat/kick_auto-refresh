// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings on install
        chrome.storage.sync.set({
            enableAutoRefresh: true,
            autoStartOnLive: true,
            refreshInterval: 15,
            maxRetries: 5,
            initialDelay: 5,
            checkVideoPlayback: true,
            checkNetworkStatus: true,
            checkBotDetection: true,
            showStatus: true,
            showOverlay: true,
            showNotifications: false,
            isFirstRun: false  // Mark that initial setup is done
        });
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
        // Open the settings page
        chrome.runtime.openOptionsPage();
    }
});

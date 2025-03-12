// Default settings including new timing options
const DEFAULT_SETTINGS = {
    enableAutoRefresh: true,
    autoStartOnLive: true,
    refreshInterval: 15,
    maxRetries: 5,
    showDuration: 6,
    periodicInterval: 180,  // Default to 180 seconds (3 minutes)
    showStatus: true,
    checkVideoPlayback: true,
    checkNetworkStatus: true,
    checkBotDetection: true,
    showOverlay: true,
    showNotifications: false
};

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        document.getElementById('enableAutoRefresh').checked = settings.enableAutoRefresh;
        document.getElementById('autoStartOnLive').checked = settings.autoStartOnLive;
        document.getElementById('refreshInterval').value = settings.refreshInterval;
        document.getElementById('maxRetries').value = settings.maxRetries;
        document.getElementById('showDuration').value = settings.showDuration;
        document.getElementById('periodicInterval').value = settings.periodicInterval / 1000; // Convert to seconds
        document.getElementById('showStatus').checked = settings.showStatus;
        document.getElementById('checkVideoPlayback').checked = settings.checkVideoPlayback;
        document.getElementById('checkNetworkStatus').checked = settings.checkNetworkStatus;
        document.getElementById('checkBotDetection').checked = settings.checkBotDetection;
        document.getElementById('showOverlay').checked = settings.showOverlay;
        document.getElementById('showNotifications').checked = settings.showNotifications;
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
        const saveButton = document.getElementById('saveSettings');
        
        // Add click animation
        saveButton.classList.add('save-animation');
        
        // Create confirmation message
        const confirmation = document.createElement('div');
        confirmation.className = 'save-confirmation';
        confirmation.textContent = 'Settings Saved!';
        
        // Position the confirmation message
        const buttonRect = saveButton.getBoundingClientRect();
        confirmation.style.left = `${buttonRect.width / 2 - 50}px`; // Center above button
        confirmation.style.bottom = `${buttonRect.height}px`;
        
        saveButton.appendChild(confirmation);
        
        // Change button state
        saveButton.style.backgroundColor = '#2ECC40';
        saveButton.textContent = 'Saved!';
        
        const settings = {
            enableAutoRefresh: document.getElementById('enableAutoRefresh').checked,
            autoStartOnLive: document.getElementById('autoStartOnLive').checked,
            refreshInterval: parseInt(document.getElementById('refreshInterval').value),
            maxRetries: parseInt(document.getElementById('maxRetries').value),
            showDuration: parseInt(document.getElementById('showDuration').value),
            periodicInterval: parseInt(document.getElementById('periodicInterval').value) * 1000,
            showStatus: document.getElementById('showStatus').checked
        };

        chrome.storage.sync.set(settings, () => {
            // Remove animation class after it completes
            setTimeout(() => {
                saveButton.classList.remove('save-animation');
            }, 300);
            
            // Reset button after delay
            setTimeout(() => {
                saveButton.textContent = 'Save Settings';
                saveButton.style.backgroundColor = '';
                if (confirmation.parentNode === saveButton) {
                    saveButton.removeChild(confirmation);
                }
            }, 1500);
        });
    });

    // Reset to defaults
    document.getElementById('resetDefaults').addEventListener('click', () => {
        chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
            location.reload();
        });
    });

    // Input validation
    document.getElementById('showDuration').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 3) e.target.value = 3;
        if (value > 10) e.target.value = 10;
    });

    document.getElementById('periodicInterval').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value < 30) e.target.value = 30;    // Minimum 30 seconds
        if (value > 300) e.target.value = 300;  // Maximum 5 minutes
    });

    // Close settings tab
    document.getElementById('closeSettings').addEventListener('click', () => {
        chrome.tabs.getCurrent(tab => {
            chrome.tabs.remove(tab.id);
        });
    });

    // Open README page in new tab
    document.getElementById('openReadme').addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('readme.html')
        });
    });
});

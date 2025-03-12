let retryCount = 0;
let checkInterval = null;
let isEnabled = true;  // Track enabled state
let overlayIndicator = null;
let statusMessage = null;
let isInitiallyLive = false;  // Track if the stream was live when we first loaded
let permanentlyOffline = false; // Track if stream has gone permanently offline
let lastKnownState = null;

// Configuration
const MAX_RETRIES = 5;
const CHECK_INTERVAL = 5000; // Check every 5 seconds
const REFRESH_DELAY = 3000;  // Wait 3 seconds before refreshing
const SHOW_DURATION = 6000;        // Show status for 6 seconds
const PERIODIC_INTERVAL = 180000;  // Show every 180 seconds (3 minutes)

// Create overlay indicator and status message in the top right
function createOverlayIndicator() {
    if (!overlayIndicator) {
        // Find the Kick logo container
        const logoContainer = document.querySelector('a[href="/"] img[alt="Kick Logo"]')?.parentElement;
        if (!logoContainer) {
            console.log('Could not find Kick logo, retrying...');
            setTimeout(createOverlayIndicator, 1000);
            return;
        }

        // Create container with Kick's button styling
        overlayIndicator = document.createElement('div');
        overlayIndicator.id = 'kick-auto-refresh-indicator';
        overlayIndicator.className = 'group inline-flex gap-1.5 items-center justify-center rounded font-semibold box-border relative transition-all';
        
        // Update the styling to match the new position
        overlayIndicator.style.cssText = `
            cursor: pointer;
            padding: 4px;
            background: transparent;
            transition: all 0.2s;
            display: flex !important;
            color: white;
            font-size: 14px;
            z-index: 403;
            margin-left: 8px;
            align-items: center;
        `;
        
        // SVG for the indicator with red circle when active
        const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24">
            <text x="50" y="70" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" 
                  font-size="70" fill="rgb(83, 252, 24)">K</text>
            <circle cx="50" cy="50" r="46" fill="none" 
                    stroke="rgb(255, 50, 50)" stroke-width="6" 
                    class="status-ring" style="display: none"
                    stroke-opacity="0.8"/>
        </svg>`;
        
        // Create status message with initial text
        statusMessage = document.createElement('span');
        statusMessage.className = 'status-message text-white text-sm';
        statusMessage.style.display = 'inline-block';
        statusMessage.textContent = 'Monitoring active';
        
        // SVG container to keep it static
        const svgContainer = document.createElement('div');
        svgContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        svgContainer.innerHTML = svgContent;

        overlayIndicator.appendChild(svgContainer);
        overlayIndicator.appendChild(statusMessage);
        
        // Create tooltip with Kick's styling
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute hidden group-hover:block bg-surface-overlay text-white text-sm rounded px-2 py-1 -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50';
        tooltip.style.pointerEvents = 'none';
        
        // Add hover effects
        overlayIndicator.addEventListener('mouseenter', () => {
            overlayIndicator.classList.add('bg-surface-tint', 'expanded');
            showStatusMessage(true);
        });
        
        overlayIndicator.addEventListener('mouseleave', () => {
            overlayIndicator.classList.remove('bg-surface-tint', 'expanded');
            showStatusMessage(false);
        });
        
        // Add click handler
        overlayIndicator.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openSettings' });
        });

        // Insert after the logo
        logoContainer.parentElement.insertBefore(overlayIndicator, logoContainer.nextSibling);

        // Start periodic status updates
        if (isChannelPage() && isEnabled) {
            startStatusUpdates();
        }
    }
}

// Function to show/hide status message with animation
function showStatusMessage(show = true, duration = SHOW_DURATION) {  // Default to 6 seconds
    if (!overlayIndicator || !statusMessage) return;

    if (show) {
        if (!statusMessage.textContent) {
            statusMessage.textContent = 'Monitoring active';
        }
        
        overlayIndicator.classList.add('expanded');
        statusMessage.style.opacity = '1';
        statusMessage.style.width = 'auto';
        statusMessage.style.display = 'inline-block';
        
        if (duration) {
            setTimeout(() => {
                if (!overlayIndicator.matches(':hover')) {
                    showStatusMessage(false);
                }
            }, duration);
        }
    } else {
        overlayIndicator.classList.remove('expanded');
        statusMessage.style.opacity = '0';
        setTimeout(() => {
            if (!overlayIndicator.matches(':hover')) {
                statusMessage.style.width = '0';
            }
        }, 600);
    }
}

// Function to periodically show status
function startStatusUpdates() {
    const showPeriodicStatus = () => {
        if (!isChannelPage()) {
            updateStatusMessage('Monitoring not active (no channel)');
            showStatusMessage(true, SHOW_DURATION);
            return;
        }

        if (isEnabled) {
            let message;
            if (permanentlyOffline) {
                message = 'Stream ended';
            } else if (retryCount > 0) {
                message = `Retry ${retryCount}/${MAX_RETRIES}`;
            } else {
                message = 'Monitoring active';
            }
            
            statusMessage.textContent = message;
            showStatusMessage(true, SHOW_DURATION);
        }
    };

    showPeriodicStatus();
    return setInterval(showPeriodicStatus, PERIODIC_INTERVAL);
}

// Update overlay visibility
function updateOverlayVisibility() {
    if (overlayIndicator) {
        const isChannel = isChannelPage();
        
        // Always show on channel pages
        overlayIndicator.style.display = 'flex';
        overlayIndicator.style.opacity = isChannel ? '1' : '0.3';
        
        // Update the status ring
        const statusRing = overlayIndicator.querySelector('.status-ring');
        if (statusRing) {
            statusRing.style.display = (isEnabled && isChannel) ? 'block' : 'none';
        }
        
        showStatusMessage();
    }
}

// Update status message
function updateStatusMessage(message, show = true) {
    if (statusMessage) {
        // Set appropriate message based on page type
        if (!isChannelPage()) {
            message = 'Monitoring not active (no channel)';
        } else if (!message) {
            message = 'Monitoring active';
        }
        
        statusMessage.textContent = message;
        statusMessage.style.display = show ? 'inline-block' : 'none';
    }
}

// Function to check if stream is live
function isStreamLive() {
    // Multiple ways to detect stream status
    const videoPlayer = document.querySelector('video[data-hls="true"]');
    const liveIndicator = document.querySelector('.live');  // The LIVE badge on profile
    const streamContainer = document.querySelector('.stream-container');
    const channelHeader = document.querySelector('[data-test="channel-header"]');
    
    // Check if video is playing and not paused
    const isVideoPlaying = videoPlayer && !videoPlayer.paused && videoPlayer.readyState > 2;
    
    // Check for live indicators
    const hasLiveIndicator = !!liveIndicator || document.querySelector('.bg-green-500')?.textContent?.includes('LIVE');
    
    // Stream is considered live if we have a video player or live indicator
    const isLive = isVideoPlaying || hasLiveIndicator || (streamContainer && channelHeader);

    console.log('Stream state check:', {
        hasVideo: !!videoPlayer,
        isPlaying: isVideoPlaying,
        hasLiveIndicator: hasLiveIndicator,
        hasStreamContainer: !!streamContainer,
        isLive: isLive
    });

    return isLive;
}

function isStreamOffline() {
    // Only check for offline state if we initially loaded with a live stream
    if (!isInitiallyLive || permanentlyOffline) return false;
    
    const videoPlayer = document.querySelector('video');
    const offlineMessage = document.querySelector('.offline-message');
    
    return !videoPlayer || 
           (videoPlayer.paused && !videoPlayer.ended) || 
           (offlineMessage && offlineMessage.style.display !== 'none');
}

function refreshPage() {
    chrome.storage.sync.get({
        enableAutoRefresh: true,
        refreshInterval: 15,
        maxRetries: 5
    }, (settings) => {
        if (!settings.enableAutoRefresh || !isInitiallyLive || permanentlyOffline) return;
        
        if (isStreamOffline()) {
            if (retryCount < settings.maxRetries) {
                retryCount++;
                updateStatusMessage(`Stream offline. Retry ${retryCount}/${settings.maxRetries} in ${settings.refreshInterval}s...`);
                setTimeout(() => {
                    location.reload();
                }, settings.refreshInterval * 1000);
            } else {
                // Stream appears to be permanently offline
                permanentlyOffline = true;
                updateStatusMessage('Stream has ended. Auto-refresh stopped.');
                updateOverlayVisibility();
                stopMonitoring();
            }
        } else {
            retryCount = 0;
            updateStatusMessage('', false); // Hide message when stream is back
        }
    });
}

// Start monitoring
function startMonitoring() {
    // Only start monitoring if we're on a channel page
    if (!isChannelPage()) {
        return;
    }

    if (checkInterval) {
        clearInterval(checkInterval);
    }
    checkInterval = setInterval(refreshPage, 5000);
}

// Stop monitoring
function stopMonitoring() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

// Function to check if current page is a channel page
function isChannelPage() {
    const urlPath = window.location.pathname;
    const pathParts = urlPath.split('/').filter(Boolean);
    
    // Exclude known non-channel pages
    const nonChannelPaths = [
        'browse',
        'following',
        'categories',
        'dashboard',
        'transactions',
        'settings',
        'clips',
        'search'
    ];
    
    // Channel pages have exactly one path segment and are not in the exclusion list
    return pathParts.length === 1 && !nonChannelPaths.includes(pathParts[0].toLowerCase());
}

// Initialize
const urlPath = window.location.pathname;

// Only initialize monitoring on channel pages
if (isChannelPage()) {
    // Add a small delay to ensure the video player is loaded
    setTimeout(() => {
        // Check if the stream is live when we first load
        isInitiallyLive = isStreamLive();
        console.log('Initial live state:', isInitiallyLive);
        
        // Check if this is first run and set default settings if needed
        chrome.storage.sync.get({ 
            enableAutoRefresh: true,  // Default to true
            isFirstRun: true         // Track if this is first run
        }, (settings) => {
            // If this is the first run, set all default settings
            if (settings.isFirstRun) {
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
            
            isEnabled = settings.enableAutoRefresh; // Use saved setting
            console.log('Extension enabled:', isEnabled);
            
            createOverlayIndicator(); // Always create indicator on channel pages
            
            // Only start monitoring if enabled and stream is live
            if (isEnabled && isInitiallyLive) {
                startMonitoring();
            }
            
            // Update overlay visibility
            updateOverlayVisibility();
        });
    }, 2000); // 2 second delay
} else {
    // On non-channel pages, just create the indicator but keep it disabled
    setTimeout(() => {
        createOverlayIndicator();
        isEnabled = false;
        updateOverlayVisibility();
        updateStatusMessage('Monitoring not active (no channel)', true);
        showStatusMessage(true, SHOW_DURATION);
    }, 1000);
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enableAutoRefresh) {
        isEnabled = changes.enableAutoRefresh.newValue;
        
        // Update overlay visibility when setting changes
        updateOverlayVisibility();
        
        // Only start monitoring if we're on a channel page
        if (isEnabled && isInitiallyLive && !permanentlyOffline && isChannelPage()) {
            startMonitoring();
        } else {
            stopMonitoring();
        }
    }
});

function isChannelLive() {
    // Check for the live indicator in the profile avatar section
    const liveIndicator = document.querySelector('span.bg-green-500.text-[10px]');
    const isLiveText = liveIndicator?.textContent?.trim().toUpperCase() === 'LIVE';

    // Check for video player existence
    const videoPlayer = document.querySelector('video[data-hls="true"]');
    const hasVideoPlayer = !!videoPlayer;

    // Check for stream container
    const streamContainer = document.querySelector('.stream-container');
    const hasStreamContainer = !!streamContainer;

    // Channel is considered live if any of these indicators are present
    return isLiveText || hasVideoPlayer || hasStreamContainer;
}

// Make sure to call this function when tabs are focused
window.addEventListener('focus', () => {
    // Update the overlay visibility when the tab receives focus
    updateOverlayVisibility();
});

// Also add a periodic check
setInterval(() => {
    if (isChannelPage() && isChannelLive()) {
        createOverlayIndicator();
        updateOverlayVisibility();
    }
}, 5000); // Check every 5 seconds

// Function to check stream status and handle changes
function checkStreamStatus() {
    const currentlyLive = isStreamLive();
    
    // If this is our first check
    if (lastKnownState === null) {
        lastKnownState = currentlyLive;
        isInitiallyLive = currentlyLive;
        
        if (currentlyLive) {
            console.log('Stream detected as initially live, monitoring enabled');
            updateStatusMessage('Monitoring active', true);
            updateOverlayVisibility();
        }
        return;
    }

    // Detect state change from live to offline
    if (lastKnownState && !currentlyLive) {
        console.log('Stream appears to have gone offline');
        
        // Wait a short time to confirm it's not just a temporary glitch
        setTimeout(() => {
            if (!isStreamLive()) {
                handleStreamOffline();
            }
        }, 2000);
    }
    // Detect recovery without refresh
    else if (!lastKnownState && currentlyLive) {
        console.log('Stream recovered without refresh');
        updateStatusMessage('Stream recovered', true);
        setTimeout(() => updateStatusMessage('', false), 3000);
        retryCount = 0;
    }

    lastKnownState = currentlyLive;
}

// Handle offline stream
function handleStreamOffline() {
    if (!isEnabled || retryCount >= MAX_RETRIES) {
        console.log('Max retries reached or monitoring disabled');
        updateStatusMessage('Max retries reached - Manual refresh needed', true);
        permanentlyOffline = true;
        updateOverlayVisibility();
        return;
    }

    retryCount++;
    const message = `Stream offline - Refreshing in 3s (Attempt ${retryCount}/${MAX_RETRIES})`;
    console.log(message);
    updateStatusMessage(message, true);

    // Wait briefly then refresh
    setTimeout(() => {
        if (!isStreamLive()) { // Double check before refresh
            location.reload();
        }
    }, REFRESH_DELAY);
}

// Create or update status overlay
function updateStatusOverlay(message) {
    let overlay = document.getElementById('stream-monitor-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'stream-monitor-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 9999;
            font-size: 12px;
            display: ${isEnabled ? 'block' : 'none'};
        `;
        document.body.appendChild(overlay);
    }

    overlay.textContent = message;
}

// Update initialization for channel pages
function initializeForChannel() {
    console.log('Initializing for channel page');
    
    createOverlayIndicator();
    
    isInitiallyLive = isStreamLive();
    console.log('Initial live state:', isInitiallyLive);
    
    chrome.storage.sync.get({ 
        enableAutoRefresh: true,
        isFirstRun: true
    }, (settings) => {
        isEnabled = settings.enableAutoRefresh;
        console.log('Extension enabled:', isEnabled);
        
        updateOverlayVisibility();
        
        if (isEnabled && isInitiallyLive) {
            startMonitoring();
            updateStatusMessage('Monitoring active');
            showStatusMessage(true, SHOW_DURATION); // Show initial status
            startStatusUpdates(); // Start periodic updates
        }
    });
}

// Initialize immediately if we're on a channel page
if (isChannelPage()) {
    initializeForChannel();
}

// Update the mutation observer
const observeNavbar = () => {
    const observer = new MutationObserver((mutations) => {
        const isChannel = isChannelPage();
        if (!document.querySelector('#kick-auto-refresh-indicator')) {
            createOverlayIndicator();
            if (isChannel) {
                isEnabled = true;
                updateOverlayVisibility();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

// Start observing immediately
observeNavbar();

// Add styles to document
const style = document.createElement('style');
style.textContent = `
    #kick-auto-refresh-indicator {
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        height: 26px; /* Match logo height */
        align-items: center;
        display: flex;
        margin-left: 8px;
    }

    .status-message {
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        margin-left: 8px;
        transform: translateX(-10px);
    }

    #kick-auto-refresh-indicator.expanded .status-message {
        opacity: 1;
        max-width: 200px;
        transform: translateX(0);
    }

    #kick-auto-refresh-indicator svg {
        height: 20px;
        width: 20px;
        flex-shrink: 0; /* Prevent logo from shrinking */
    }

    .status-ring {
        transition: all 0.4s ease-in-out;
    }

    #stream-monitor-overlay {
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0.8;
    }

    #stream-monitor-overlay:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Also update the initialization timing
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        createOverlayIndicator();
        updateOverlayVisibility();
    }, 1000);
});

// Background script to handle browser action clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if API key is saved
    const data = await chrome.storage.sync.get('geminiApiKey');
    
    if (!data.geminiApiKey) {
      // No API key found, open popup for configuration
      chrome.action.setPopup({popup: 'popup/popup.html'});
      chrome.action.openPopup();
      return;
    }

    // API key exists, perform direct translation
    await performDirectTranslation(tab.id, data.geminiApiKey);
    
  } catch (error) {
    console.error('Background script error:', error);
    // Fallback to popup on error
    chrome.action.setPopup({popup: 'popup/popup.html'});
    chrome.action.openPopup();
  }
});

async function performDirectTranslation(tabId, apiKey) {
  try {
    // Show loading indicator on extension badge
    chrome.action.setBadgeText({text: '...', tabId: tabId});
    chrome.action.setBadgeBackgroundColor({color: '#0070f3', tabId: tabId});
    
    // Inject content script if not already present
    await chrome.scripting.executeScript({
      target: {tabId: tabId},
      files: ['content.js']
    });

    // Send translation message to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'translate',
      apiKey: apiKey
    });

    // Clear badge and show notification if translation was successful
    if (response && response.status === 'success') {
      chrome.action.setBadgeText({text: '✓', tabId: tabId});
      chrome.action.setBadgeBackgroundColor({color: '#28a745', tabId: tabId});
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.png',
        title: '翻訳完了',
        message: 'ページの翻訳が完了しました'
      });
      
      // Clear success badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({text: '', tabId: tabId});
      }, 3000);
    } else {
      throw new Error(response ? response.error : '翻訳に失敗しました');
    }
  } catch (error) {
    console.error('Translation error:', error);
    
    // Show error badge
    chrome.action.setBadgeText({text: '!', tabId: tabId});
    chrome.action.setBadgeBackgroundColor({color: '#dc3545', tabId: tabId});
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: '翻訳エラー',
      message: `翻訳に失敗しました: ${error.message}`
    });
    
    // Clear error badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({text: '', tabId: tabId});
    }, 5000);
  }
}

// Initialize - disable popup by default when API key exists
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.sync.get('geminiApiKey');
  if (data.geminiApiKey) {
    chrome.action.setPopup({popup: ''});
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get('geminiApiKey');
  if (data.geminiApiKey) {
    chrome.action.setPopup({popup: ''});
  }
});
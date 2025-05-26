import { translateHTMLContent } from '../utils/translation';

// ページ内の翻訳処理を担当するコンテンツスクリプト
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'translate') {
    translatePage(request.apiKey)
      .then(() => sendResponse({status: 'success'}))
      .catch(error => sendResponse({status: 'error', error: error.message}));
    return true; // 非同期レスポンスのために必要
  }
});

async function translatePage(apiKey) {
  try {
    // 翻訳中のプログレス表示
    showProgressIndicator();
    
    // 翻訳前の状態を保存
    const originalState = saveOriginalState();
    
    // プログレス更新コールバック
    const onProgress = (progress) => {
      updateProgressIndicator(progress);
    };
    
    // 翻訳を実行（インクリメンタル反映付き）
    await translateHTMLContent(document.body, apiKey, onProgress);
    
    // プログレス表示を隠す
    hideProgressIndicator();
    
    // 翻訳切り替えボタンを追加
    addTranslationToggle(originalState);
  } catch (error) {
    console.error('翻訳エラー:', error);
    hideProgressIndicator();
    throw error;
  }
}

function saveOriginalState() {
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!isInScriptOrStyle(node)) {
      textNodes.push({
        node: node,
        originalText: node.textContent
      });
    }
  }

  return textNodes;
}

function isInScriptOrStyle(node) {
  let parent = node.parentNode;
  while (parent) {
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

// 翻訳表示切り替えボタンの追加
function addTranslationToggle(originalState) {
  // 既存のボタンがあれば削除
  const existingButton = document.getElementById('translation-toggle-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const toggleButton = document.createElement('button');
  toggleButton.id = 'translation-toggle-btn';
  toggleButton.textContent = '原文/翻訳 切替';
  Object.assign(toggleButton.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    zIndex: '2147483647',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '120px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  });

  // ホバー効果を追加
  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.backgroundColor = '#0056b3';
    toggleButton.style.transform = 'translateY(-1px)';
    toggleButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  });
  
  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.backgroundColor = '#0070f3';
    toggleButton.style.transform = 'translateY(0)';
    toggleButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });

  let isTranslated = true;
  toggleButton.addEventListener('click', () => {
    originalState.forEach(item => {
      if (isTranslated) {
        // 原文に戻す
        item.node.textContent = item.originalText;
      } else {
        // 翻訳を表示
        item.node.textContent = item.node._translatedText || item.node.textContent;
      }
    });
    isTranslated = !isTranslated;
    toggleButton.textContent = isTranslated ? '原文表示' : '翻訳表示';
  });

  document.body.appendChild(toggleButton);
}

// プログレスインジケーターの表示
function showProgressIndicator() {
  // 既存の表示があれば削除
  const existingIndicator = document.getElementById('translation-progress');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'translation-progress';
  indicator.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="spinner"></div>
      <span id="progress-text">翻訳中...</span>
    </div>
    <div id="progress-bar-container" style="margin-top: 8px; width: 120px; height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
      <div id="progress-bar" style="height: 100%; background-color: #0070f3; width: 0%; transition: width 0.3s ease;"></div>
    </div>
    <style>
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #0070f3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  Object.assign(indicator.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    color: '#333',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    zIndex: '2147483647',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '140px',
    textAlign: 'center'
  });

  document.body.appendChild(indicator);
}

// プログレスインジケーターの更新
function updateProgressIndicator(progress) {
  const progressText = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  
  if (progressText && progressBar) {
    progressText.textContent = `翻訳中... ${progress.percentage}%`;
    progressBar.style.width = `${progress.percentage}%`;
    
    if (progress.error) {
      progressText.textContent = `エラーあり ${progress.percentage}%`;
      progressText.style.color = '#d32f2f';
    }
  }
}

// プログレスインジケーターの非表示
function hideProgressIndicator() {
  const indicator = document.getElementById('translation-progress');
  if (indicator) {
    indicator.remove();
  }
}

// DOMの読み込み完了後に翻訳を開始
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
    if (geminiApiKey) {
      await translatePage(geminiApiKey);
    }
  } catch (error) {
    console.error('初期化エラー:', error);
  }
}); 
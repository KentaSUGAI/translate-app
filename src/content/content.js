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
    // 翻訳前の状態を保存
    const originalState = saveOriginalState();
    
    // 翻訳を実行
    await translateHTMLContent(document.body, apiKey);
    
    // 翻訳切り替えボタンを追加
    addTranslationToggle(originalState);
  } catch (error) {
    console.error('翻訳エラー:', error);
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
  const toggleButton = document.createElement('button');
  toggleButton.textContent = '原文/翻訳 切替';
  Object.assign(toggleButton.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '10px 20px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: '10000',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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

// DOMの読み込み完了後に翻訳を開始
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (apiKey) {
      await translatePage(apiKey);
    }
  } catch (error) {
    console.error('初期化エラー:', error);
  }
}); 
document.addEventListener('DOMContentLoaded', function() {
  // APIキーの保存状態を確認
  chrome.storage.sync.get('geminiApiKey', function(data) {
    if (data.geminiApiKey) {
      document.getElementById('apiKey').value = data.geminiApiKey;
      document.getElementById('status').textContent = 'APIキーが保存されています。拡張機能アイコンをクリックするだけで翻訳できます！';
      
      // APIキーが設定済みの場合のUI調整
      showSettingsMode();
      updatePopupBehavior(true);
    } else {
      document.getElementById('status').textContent = 'APIキーを設定してください';
      showSetupMode();
      updatePopupBehavior(false);
    }
  });

  // APIキー保存ボタンのイベントリスナー
  document.getElementById('saveKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    if (apiKey) {
      chrome.storage.sync.set({geminiApiKey: apiKey}, function() {
        document.getElementById('status').textContent = 'APIキーを保存しました。今後は拡張機能アイコンをクリックするだけで翻訳できます！';
        
        // APIキーが保存されたので、UI とポップアップ動作を更新
        showSettingsMode();
        updatePopupBehavior(true);
      });
    } else {
      document.getElementById('status').textContent = 'APIキーを入力してください';
    }
  });

  // 設定ボタンのイベントリスナー
  document.getElementById('settings').addEventListener('click', function() {
    showSetupMode();
  });

  // 翻訳ボタンのイベントリスナー
  document.getElementById('translate').addEventListener('click', async function() {
    const translateButton = document.getElementById('translate');
    const statusDiv = document.getElementById('status');
    
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab) {
        statusDiv.textContent = 'アクティブなタブが見つかりません';
        return;
      }

      const data = await chrome.storage.sync.get('geminiApiKey');
      if (!data.geminiApiKey) {
        statusDiv.textContent = 'APIキーを設定してください';
        return;
      }

      // ボタンを無効化して、ローディング状態を表示
      translateButton.disabled = true;
      translateButton.textContent = '翻訳中...';
      statusDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 8px;"><div class="popup-spinner"></div><span>ページを翻訳しています...</span></div>';

      // コンテンツスクリプトが注入されていることを確認
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content.js']
      });

      // メッセージを送信
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'translate',
        apiKey: data.geminiApiKey
      });

      if (response && response.status === 'success') {
        statusDiv.textContent = '翻訳が完了しました！ページで切り替えボタンをご確認ください。';
        translateButton.textContent = '再翻訳';
      } else {
        statusDiv.textContent = '翻訳に失敗しました: ' + (response ? response.error : '不明なエラー');
        translateButton.textContent = '現在のページを翻訳';
      }
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = '翻訳に失敗しました: ' + error.message;
      translateButton.textContent = '現在のページを翻訳';
    } finally {
      translateButton.disabled = false;
    }
  });
});

// ポップアップの動作を制御する関数
function updatePopupBehavior(hasApiKey) {
  if (hasApiKey) {
    // APIキーが設定済みの場合、次回から直接翻訳を実行するようにポップアップを無効化
    chrome.action.setPopup({popup: ''});
  } else {
    // APIキーが未設定の場合、ポップアップを有効化
    chrome.action.setPopup({popup: 'popup/popup.html'});
  }
}

// 設定モード（APIキー設定済み）のUI表示
function showSettingsMode() {
  document.getElementById('apiKey').style.display = 'none';
  document.querySelector('label[for="apiKey"]').style.display = 'none';
  document.getElementById('saveKey').style.display = 'none';
  document.getElementById('translate').style.display = 'inline-block';
  document.getElementById('settings').style.display = 'inline-block';
}

// セットアップモード（APIキー未設定）のUI表示
function showSetupMode() {
  document.getElementById('apiKey').style.display = 'block';
  document.querySelector('label[for="apiKey"]').style.display = 'block';
  document.getElementById('saveKey').style.display = 'inline-block';
  document.getElementById('translate').style.display = 'inline-block';
  document.getElementById('settings').style.display = 'none';
} 
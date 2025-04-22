document.addEventListener('DOMContentLoaded', function() {
  // APIキーの保存状態を確認
  chrome.storage.sync.get('geminiApiKey', function(data) {
    if (data.geminiApiKey) {
      document.getElementById('apiKey').value = data.geminiApiKey;
      document.getElementById('status').textContent = 'APIキーが保存されています';
    }
  });

  // APIキー保存ボタンのイベントリスナー
  document.getElementById('saveKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    if (apiKey) {
      chrome.storage.sync.set({geminiApiKey: apiKey}, function() {
        document.getElementById('status').textContent = 'APIキーを保存しました';
      });
    } else {
      document.getElementById('status').textContent = 'APIキーを入力してください';
    }
  });

  // 翻訳ボタンのイベントリスナー
  document.getElementById('translate').addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab) {
        document.getElementById('status').textContent = 'アクティブなタブが見つかりません';
        return;
      }

      const data = await chrome.storage.sync.get('geminiApiKey');
      if (!data.geminiApiKey) {
        document.getElementById('status').textContent = 'APIキーを設定してください';
        return;
      }

      document.getElementById('status').textContent = '翻訳中...';

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
        document.getElementById('status').textContent = '翻訳が完了しました';
      } else {
        document.getElementById('status').textContent = '翻訳に失敗しました: ' + (response ? response.error : '不明なエラー');
      }
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('status').textContent = '翻訳に失敗しました: ' + error.message;
    }
  });
}); 
export function extractMainContent() {
  // ページの主要なテキストコンテンツを抽出するロジック
  // 簡易版: articleタグ、mainタグ、または特定のクラスを持つ要素を取得
  const contentElements = document.querySelectorAll('article, main, .content, .article, .post');
  
  // 適切な要素が見つからない場合はbodyを使用
  if (contentElements.length === 0) {
    return document.body.innerText;
  }
  
  // 最も内容が多そうな要素を選択（単純に文字数で判断）
  let bestElement = contentElements[0];
  let maxLength = bestElement.innerText.length;
  
  for (let i = 1; i < contentElements.length; i++) {
    const length = contentElements[i].innerText.length;
    if (length > maxLength) {
      maxLength = length;
      bestElement = contentElements[i];
    }
  }
  
  return bestElement.innerText;
}

export function replaceContent(translatedText) {
  // 翻訳結果を表示するためのオーバーレイを作成
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'white';
  overlay.style.zIndex = '9999';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.overflowY = 'auto';
  
  // 閉じるボタンを追加
  const closeButton = document.createElement('button');
  closeButton.textContent = '元のページに戻る';
  closeButton.style.position = 'fixed';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.zIndex = '10000';
  closeButton.style.padding = '8px 16px';
  closeButton.style.backgroundColor = '#4285f4';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(overlay);
    document.body.removeChild(closeButton);
  });
  
  // 翻訳テキストをオーバーレイに設定
  const contentDiv = document.createElement('div');
  contentDiv.style.marginTop = '50px';
  
  // 翻訳テキストを段落に分割してフォーマット
  translatedText.split('\n\n').forEach(paragraph => {
    if (paragraph.trim()) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      p.style.lineHeight = '1.6';
      p.style.marginBottom = '16px';
      p.style.fontSize = '16px';
      contentDiv.appendChild(p);
    }
  });
  
  overlay.appendChild(contentDiv);
  document.body.appendChild(overlay);
  document.body.appendChild(closeButton);
} 
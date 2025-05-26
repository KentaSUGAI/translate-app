export async function translateWithGemini(text, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `以下の文章を日本語に翻訳してください。文章はSEPARATORで区切られています。各文章を翻訳し、同じようにSEPARATORで区切って返してください。\n\n${text}`
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API error: ${errorData.error.message || 'Unknown error'}`);
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error('翻訳結果の形式が不正です');
  }
}

export function splitTextIntoChunks(text, chunkSize) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?。！？])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < chunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

export async function translateHTMLContent(element, apiKey, onProgress = null) {
  // テキストノードを収集
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  // 翻訳キャッシュ
  const translationCache = new Map();
  
  // 翻訳すべきテキストを収集
  const textsToTranslate = new Set();
  
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!isInScriptOrStyle(node)) {
      const text = node.textContent.trim();
      if (text) {
        textsToTranslate.add(text);
        textNodes.push({
          node: node,
          text: text
        });
      }
    }
  }

  // テキストをバッチに分割（合計4000文字以内になるように）
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;
  
  for (const text of textsToTranslate) {
    if (currentLength + text.length > 3800) { // マージンを持たせる
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [text];
      currentLength = text.length;
    } else {
      currentBatch.push(text);
      currentLength += text.length;
    }
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  let completedBatches = 0;
  const totalBatches = batches.length;

  // バッチごとに翻訳（プログレス通知付き）
  for (const batch of batches) {
    try {
      const batchText = batch.join('\n---SEPARATOR---\n');
      const translatedBatchText = await translateWithGemini(batchText, apiKey);
      
      // 翻訳結果を分割して個別のテキストに対応付け
      const translatedTexts = translatedBatchText.split('\n---SEPARATOR---\n');
      
      batch.forEach((originalText, index) => {
        if (translatedTexts[index]) {
          translationCache.set(originalText, translatedTexts[index].trim());
        }
      });

      // 即座に翻訳済みテキストを適用（インクリメンタル反映）
      textNodes.forEach(({node, text}) => {
        const translatedText = translationCache.get(text);
        if (translatedText && !node._translatedText) {
          node._translatedText = translatedText; // 切り替え用に保存
          node.textContent = translatedText;
        }
      });

      completedBatches++;
      
      // プログレス通知
      if (onProgress) {
        onProgress({
          completed: completedBatches,
          total: totalBatches,
          percentage: Math.round((completedBatches / totalBatches) * 100)
        });
      }

    } catch (error) {
      console.error('バッチ翻訳エラー:', error);
      completedBatches++;
      
      // エラー時もプログレス通知
      if (onProgress) {
        onProgress({
          completed: completedBatches,
          total: totalBatches,
          percentage: Math.round((completedBatches / totalBatches) * 100),
          error: error.message
        });
      }
    }
  }
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

export async function translateHTMLWithGemini(html, apiKey) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const textNodes = extractTextNodes(doc.body);
  const translatedNodes = [];
  
  for (const node of textNodes) {
    try {
      const translatedText = await translateWithGemini(node.text, apiKey);
      translatedNodes.push({
        ...node,
        translatedText
      });
    } catch (error) {
      console.error('翻訳エラー:', error);
      translatedNodes.push({
        ...node,
        translatedText: node.text // エラー時は元のテキストを使用
      });
    }
  }
  
  // 翻訳結果を元のHTMLに反映
  return applyTranslations(doc, translatedNodes);
}

function extractTextNodes(element) {
  const textNodes = [];
  
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const range = document.createRange();
      range.selectNode(node);
      const rect = range.getBoundingClientRect();
      
      textNodes.push({
        text: node.textContent,
        path: getNodePath(node),
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        originalStyles: window.getComputedStyle(node.parentElement)
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }
  
  traverse(element);
  return textNodes;
}

function getNodePath(node) {
  const path = [];
  let current = node;
  
  while (current.parentNode) {
    const index = Array.from(current.parentNode.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .indexOf(current);
    path.unshift(index);
    current = current.parentNode;
  }
  
  return path;
}

function applyTranslations(doc, translatedNodes) {
  translatedNodes.forEach(node => {
    const targetNode = findNodeByPath(doc.body, node.path);
    if (targetNode) {
      const translationOverlay = document.createElement('div');
      translationOverlay.className = 'translation-overlay';
      translationOverlay.textContent = node.translatedText;
      
      Object.assign(translationOverlay.style, {
        position: 'absolute',
        top: `${node.position.top}px`,
        left: `${node.position.left}px`,
        width: `${node.position.width}px`,
        height: `${node.position.height}px`,
        fontSize: node.originalStyles.fontSize,
        fontFamily: node.originalStyles.fontFamily,
        lineHeight: node.originalStyles.lineHeight,
        color: node.originalStyles.color,
        backgroundColor: 'transparent',
        opacity: '0',
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
        zIndex: '9999'
      });

      // ホバー時のスタイルを設定するCSSを追加
      const style = document.createElement('style');
      style.textContent = `
        .original-text:hover + .translation-overlay {
          opacity: 1;
          background-color: rgba(255, 255, 255, 0.95);
        }
      `;
      document.head.appendChild(style);

      // 元のテキストを包むラッパー要素
      const wrapper = document.createElement('span');
      wrapper.className = 'original-text';
      targetNode.parentNode.insertBefore(wrapper, targetNode);
      wrapper.appendChild(targetNode);
      
      // オーバーレイを追加
      wrapper.parentNode.insertBefore(translationOverlay, wrapper.nextSibling);
    }
  });
}

function findNodeByPath(element, path) {
  let current = element;
  
  for (const index of path) {
    const textNodes = Array.from(current.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE);
    
    if (index >= textNodes.length) {
      return null;
    }
    
    current = textNodes[index];
  }
  
  return current;
} 
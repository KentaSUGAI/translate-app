import React, { useState } from 'react';
import { translateHTMLWithGemini } from '../utils/translation';

const HTMLTranslator = ({ apiKey }) => {
  const [html, setHtml] = useState('');
  const [translatedHtml, setTranslatedHtml] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  const handleTranslate = async () => {
    if (!html.trim()) return;

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateHTMLWithGemini(html, apiKey);
      setTranslatedHtml(result);
    } catch (err) {
      setError(err.message);
      console.error('翻訳エラー:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="html-translator">
      <div className="input-section">
        <h3>HTMLを入力</h3>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="翻訳したいHTMLを入力してください"
          rows={10}
        />
        <button 
          onClick={handleTranslate}
          disabled={isTranslating || !html.trim()}
        >
          {isTranslating ? '翻訳中...' : '翻訳する'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>エラーが発生しました: {error}</p>
        </div>
      )}

      {translatedHtml && (
        <div className="result-section">
          <h3>翻訳結果</h3>
          <div 
            className="translated-content"
            dangerouslySetInnerHTML={{ __html: translatedHtml }}
          />
        </div>
      )}

      <style jsx>{`
        .html-translator {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .input-section {
          margin-bottom: 20px;
        }

        textarea {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: monospace;
        }

        button {
          padding: 10px 20px;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          color: red;
          margin: 10px 0;
        }

        .result-section {
          margin-top: 20px;
          border: 1px solid #eee;
          padding: 20px;
          border-radius: 4px;
        }

        .translated-content {
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default HTMLTranslator; 
import React, { useState } from 'react';
import HTMLTranslator from '../components/HTMLTranslator';

export default function Home() {
  const [apiKey, setApiKey] = useState('');

  return (
    <div className="container">
      <header>
        <h1>HTML翻訳アプリ</h1>
        <div className="api-key-input">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Gemini APIキーを入力"
          />
        </div>
      </header>

      <main>
        {apiKey ? (
          <HTMLTranslator apiKey={apiKey} />
        ) : (
          <div className="api-key-required">
            <p>翻訳機能を使用するには、Gemini APIキーを入力してください。</p>
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
        }

        header {
          padding: 2rem 0;
          text-align: center;
        }

        .api-key-input {
          margin: 1rem 0;
        }

        .api-key-input input {
          padding: 0.5rem;
          width: 300px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .api-key-required {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        main {
          padding: 2rem 0;
        }
      `}</style>
    </div>
  );
} 
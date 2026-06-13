import { useState, useEffect } from 'react';
import './App.css';

// ！重要：改成你的 Render 后端地址
const API_BASE_URL = 'https://bunny-backend-1nmg.onrender.com';

function App() {
  const [sessions, setSessions] = useState([
    { id: 1, name: '默认会话', messages: [] }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    const container = document.querySelector('.messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsg = { id: Date.now(), role: 'user', content: inputValue };
    
    setSessions(prev =>
      prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, userMsg] }
          : s
      )
    );
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMsg.content,
          model: selectedModel
        })
      });
      const data = await response.json();
      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: data.reply };
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, aiMsg] }
            : s
        )
      );
    } catch (error) {
      console.error('请求失败:', error);
      const errorMsg = { id: Date.now() + 1, role: 'assistant', content: '网络错误，请检查后端是否正常运行。' };
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const newSession = () => {
    const newId = Date.now();
    setSessions([...sessions, { id: newId, name: '新对话', messages: [] }]);
    setCurrentSessionId(newId);
  };

  const deleteSession = (id) => {
    if (sessions.length === 1) return;
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
  };

  const renameSession = (id) => {
    const newName = prompt('输入新名称');
    if (newName) {
      setSessions(sessions.map(s => s.id === id ? { ...s, name: newName } : s));
    }
  };

  return (
    <div className="app">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={newSession}>+ 新建会话</button>
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(false)}>«</button>
        </div>
        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <span>{session.name}</span>
              <div className="session-actions">
                <button onClick={(e) => { e.stopPropagation(); renameSession(session.id); }}>✏️</button>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {!sidebarOpen && (
          <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>☰</button>
        )}
        <div className="chat-header">
          <h2>{currentSession?.name}</h2>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            <option value="deepseek">DeepSeek (推荐)</option>
            <option value="claude">Claude (需配置)</option>
            <option value="gpt">GPT (需配置)</option>
          </select>
        </div>
        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="bubble thinking">思考中...</div>
            </div>
          )}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading}>发送</button>
        </div>
      </div>
    </div>
  );
}

export default App;

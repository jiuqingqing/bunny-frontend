import { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://bunny-backend-1nmg.onrender.com';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`);
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      console.error('加载会话失败:', err);
    }
  };

  // 加载某个会话的消息
  const loadMessages = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${sessionId}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  };

  // 初始化加载会话
  useEffect(() => {
    loadSessions();
  }, []);

  // 当前会话改变时加载其消息
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  // 自动滚动到底部
  useEffect(() => {
    const container = document.querySelector('.messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // 新建会话
  const newSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新对话' })
      });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error('创建会话失败:', err);
    }
  };

  // 重命名会话
  const renameSession = async (id) => {
    const newName = prompt('输入新名称');
    if (!newName) return;
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      setSessions(sessions.map(s => s.id === id ? { ...s, name: newName } : s));
    } catch (err) {
      console.error('重命名失败:', err);
    }
  };

  // 删除会话
  const deleteSession = async (id) => {
    if (sessions.length === 1) {
      alert('至少保留一个会话');
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${id}`, { method: 'DELETE' });
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) {
        setCurrentSessionId(newSessions[0].id);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsgText = inputValue;
    setInputValue('');
    setIsLoading(true);

    // 临时显示用户消息（等待后端返回后刷新消息列表）
    // 简单起见，直接调用 API，然后重新加载消息
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMsgText,
          model: selectedModel
        })
      });
      if (response.ok) {
        // 重新加载当前会话的消息列表
        await loadMessages(currentSessionId);
        // 同时更新会话列表中的 updated_at 可以在下次加载时体现，简单重新加载会话列表
        loadSessions();
      } else {
        const err = await response.json();
        console.error('发送失败:', err);
      }
    } catch (error) {
      console.error('网络错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSessionName = sessions.find(s => s.id === currentSessionId)?.name || '对话';

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
          <h2>{currentSessionName}</h2>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
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

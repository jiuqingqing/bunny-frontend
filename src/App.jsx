import { useState } from 'react';
import './App.css';

function App() {
  // 模拟会话数据
  const [sessions, setSessions] = useState([
    { id: 1, name: '小兔乖乖', messages: [{ id: 1, role: 'assistant', content: '你好呀！今天想聊什么？' }] },
    { id: 2, name: '深夜灵感', messages: [] },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 获取当前会话的消息
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // 发送消息（模拟AI回复）
  const handleSend = () => {
    if (!inputValue.trim()) return;
    // 添加用户消息
    const userMsg = { id: Date.now(), role: 'user', content: inputValue };
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMsg] };
      }
      return s;
    });
    // 模拟AI回复（延迟0.5秒）
    const aiReply = { id: Date.now() + 1, role: 'assistant', content: '这是模拟回复，等你连接后端后就会变成真实的AI回答啦！' };
    setTimeout(() => {
      setSessions(prev =>
        prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, aiReply] };
          }
          return s;
        })
      );
    }, 500);
    setSessions(updatedSessions);
    setInputValue('');
  };

  // 新建会话
  const newSession = () => {
    const newId = Date.now();
    setSessions([...sessions, { id: newId, name: '新对话', messages: [] }]);
    setCurrentSessionId(newId);
  };

  // 删除会话
  const deleteSession = (id) => {
    if (sessions.length === 1) return;
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
  };

  // 重命名会话（简单弹窗）
  const renameSession = (id) => {
    const newName = prompt('输入新名称');
    if (newName) {
      setSessions(sessions.map(s => s.id === id ? { ...s, name: newName } : s));
    }
  };

  return (
    <div className="app">
      {/* 侧边栏 */}
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

      {/* 主聊天区域 */}
      <div className="chat-area">
        {!sidebarOpen && (
          <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>☰</button>
        )}
        <div className="chat-header">
          <h2>{currentSession?.name}</h2>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            <option value="claude">Claude (主模型)</option>
            <option value="deepseek">DeepSeek (备选)</option>
            <option value="gpt">GPT (模拟)</option>
          </select>
        </div>
        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
          />
          <button onClick={handleSend}>发送</button>
        </div>
      </div>
    </div>
  );
}

export default App;
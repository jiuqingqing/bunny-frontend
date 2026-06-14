import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'https://api.fanfanchat.xyz';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTokenUsage, setLastTokenUsage] = useState(0);

  // 模态框引用
  const newSessionDialogRef = useRef(null);
  const editPersonaDialogRef = useRef(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPersona, setEditPersona] = useState('');

  // 新建会话模态框表单
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPersona, setNewSessionPersona] = useState('');

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

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    const container = document.querySelector('.messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // 新建会话（弹出模态框）
  const openNewSessionModal = () => {
    setNewSessionName('');
    setNewSessionPersona('');
    newSessionDialogRef.current?.showModal();
  };

  const createNewSession = async () => {
    const name = newSessionName.trim() || '新对话';
    const persona = newSessionPersona.trim() || null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, system_prompt: persona })
      });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      newSessionDialogRef.current?.close();
    } catch (err) {
      console.error('创建会话失败:', err);
    }
  };

  // 编辑会话人设（重命名 + 修改人设）
  const openEditPersonaModal = (session) => {
    setEditingSessionId(session.id);
    setEditName(session.name);
    setEditPersona(session.system_prompt || '');
    editPersonaDialogRef.current?.showModal();
  };

  const updateSession = async () => {
    if (!editingSessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${editingSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || '未命名',
          system_prompt: editPersona.trim() || null
        })
      });
      const updated = await res.json();
      setSessions(sessions.map(s => s.id === updated.id ? updated : s));
      if (currentSessionId === updated.id) {
        // 刷新当前会话的消息（人设改变不会影响历史，但后续对话会生效）
        await loadMessages(currentSessionId);
      }
      editPersonaDialogRef.current?.close();
    } catch (err) {
      console.error('更新会话失败:', err);
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
    setLastTokenUsage(0);

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
      const data = await response.json();
      if (response.ok) {
        await loadMessages(currentSessionId);
        if (data.token_usage) setLastTokenUsage(data.token_usage);
        loadSessions(); // 刷新会话列表（更新时间）
      } else {
        console.error('发送失败:', data.error);
      }
    } catch (error) {
      console.error('网络错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="app">
      {/* 侧边栏 */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={openNewSessionModal}>+ 新建会话</button>
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(false)}>«</button>
        </div>
        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <span className="session-name">{session.name}</span>
              <div className="session-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditPersonaModal(session); }}
                  title="编辑人设"
                  className="edit-persona-btn"
                >
                  ⚙️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="delete-session-btn"
                >
                  🗑️
                </button>
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
          <h2>{currentSession?.name || '对话'}</h2>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="claude">Claude (需配置)</option>
            <option value="gpt">GPT (需配置)</option>
          </select>
        </div>
        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="bubble">{msg.content}</div>
              {msg.role === 'assistant' && idx === messages.length - 1 && lastTokenUsage > 0 && (
                <div className="token-info">⚡ 消耗 {lastTokenUsage} tokens</div>
              )}
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

      {/* 新建会话模态框 */}
      <dialog ref={newSessionDialogRef} className="modal">
        <div className="modal-content">
          <h3>新建会话</h3>
          <label>会话名称</label>
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="例如: 我的男友"
          />
          <label>角色人设（可选）</label>
          <textarea
            rows="4"
            value={newSessionPersona}
            onChange={(e) => setNewSessionPersona(e.target.value)}
            placeholder="例如: 你是我的AI男友，名叫小杰，性格温柔体贴，喜欢叫我宝贝...（留空则使用全局默认）"
          />
          <div className="modal-buttons">
            <button onClick={createNewSession}>创建</button>
            <button onClick={() => newSessionDialogRef.current?.close()}>取消</button>
          </div>
        </div>
      </dialog>

      {/* 编辑会话模态框（重命名 + 修改人设） */}
      <dialog ref={editPersonaDialogRef} className="modal">
        <div className="modal-content">
          <h3>编辑会话</h3>
          <label>会话名称</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <label>角色人设</label>
          <textarea
            rows="4"
            value={editPersona}
            onChange={(e) => setEditPersona(e.target.value)}
            placeholder="在此设置该会话独有的AI性格，留空则使用全局默认"
          />
          <div className="modal-buttons">
            <button onClick={updateSession}>保存</button>
            <button onClick={() => editPersonaDialogRef.current?.close()}>取消</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default App;

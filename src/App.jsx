import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'https://api.fanfanchat.xyz';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTokenUsage, setLastTokenUsage] = useState(0);

  const [globalSettings, setGlobalSettings] = useState({
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 2000,
    world_book: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);

  const newSessionDialogRef = useRef(null);
  const editPersonaDialogRef = useRef(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPersona, setEditPersona] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPersona, setNewSessionPersona] = useState('');

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadGlobalSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      const data = await res.json();
      setGlobalSettings({
        system_prompt: data.system_prompt || '',
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 2000,
        world_book: data.world_book || ''
      });
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  };

  const saveGlobalSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSettings)
      });
      if (res.ok) {
        setGlobalSettings(tempSettings);
        setShowSettings(false);
      }
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  };

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
    loadGlobalSettings();
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) loadMessages(currentSessionId);
  }, [currentSessionId]);

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
      if (currentSessionId === updated.id) await loadMessages(currentSessionId);
      editPersonaDialogRef.current?.close();
    } catch (err) {
      console.error('更新会话失败:', err);
    }
  };

  const deleteSession = async (id) => {
    if (sessions.length === 1) { alert('至少保留一个会话'); return; }
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${id}`, { method: 'DELETE' });
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsgText = inputValue;
    setInputValue('');

    const tempUserMsg = {
      id: Date.now(),
      session_id: currentSessionId,
      role: 'user',
      content: userMsgText,
      created_at: new Date().toISOString(),
      visible: true
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);
    setLastTokenUsage(0);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMsgText,
          model: selectedModel,
          temperature: globalSettings.temperature,
          max_tokens: globalSettings.max_tokens
        })
      });
      const data = await response.json();
      if (response.ok) {
        const aiMsg = {
          id: Date.now() + 1,
          session_id: currentSessionId,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
          visible: true
        };
        setMessages(prev => [...prev, aiMsg]);
        if (data.token_usage) setLastTokenUsage(data.token_usage);
        loadSessions();
      } else {
        const errorMsg = {
          id: Date.now() + 1,
          session_id: currentSessionId,
          role: 'assistant',
          content: `❌ 错误：${data.error || '未知错误'}`,
          created_at: new Date().toISOString(),
          visible: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg = {
        id: Date.now() + 1,
        session_id: currentSessionId,
        role: 'assistant',
        content: '❌ 网络错误，请检查后端是否正常运行。',
        created_at: new Date().toISOString(),
        visible: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="app">
      {sidebarOpen && window.innerWidth < 768 && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={openNewSessionModal}>+ 新建会话</button>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>✕</button>
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
                <button onClick={(e) => { e.stopPropagation(); openEditPersonaModal(session); }} title="编辑人设">⚙️</button>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>{currentSession?.name || '对话'}</h2>
          <div className="header-actions">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              <option value="deepseek">DeepSeek</option>
              <option value="claude">Claude</option>
              <option value="gpt">GPT</option>
            </select>
            <button className="settings-btn" onClick={() => { setTempSettings(globalSettings); setShowSettings(true); }}>⚙️</button>
          </div>
        </header>

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
          <div ref={messagesEndRef} />
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
      </main>

      <dialog ref={newSessionDialogRef} className="modal">
        <div className="modal-content">
          <h3>新建会话</h3>
          <label>会话名称</label>
          <input type="text" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} placeholder="例如: 我的男友" />
          <label>角色人设（可选）</label>
          <textarea rows="4" value={newSessionPersona} onChange={e => setNewSessionPersona(e.target.value)} placeholder="例如: 你是我的AI男友...（留空则使用全局默认）" />
          <div className="modal-buttons">
            <button onClick={createNewSession}>创建</button>
            <button onClick={() => newSessionDialogRef.current?.close()}>取消</button>
          </div>
        </div>
      </dialog>

      <dialog ref={editPersonaDialogRef} className="modal">
        <div className="modal-content">
          <h3>编辑会话</h3>
          <label>会话名称</label>
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
          <label>角色人设（可留空以使用全局默认）</label>
          <textarea rows="4" value={editPersona} onChange={e => setEditPersona(e.target.value)} placeholder="在此设置该会话独有的AI性格" />
          <div className="modal-buttons">
            <button onClick={updateSession}>保存</button>
            <button onClick={() => editPersonaDialogRef.current?.close()}>取消</button>
          </div>
        </div>
      </dialog>

      {showSettings && (
        <dialog open className="modal" onClose={() => setShowSettings(false)}>
          <div className="modal-content">
            <h3>全局 AI 设置</h3>
            <label>世界书（场景记忆/世界观设定）</label>
            <textarea rows="4" value={tempSettings.world_book} onChange={e => setTempSettings({ ...tempSettings, world_book: e.target.value })} placeholder="例如：这是一个魔法世界，龙与骑士共存。主角是一位勇敢的冒险者..." />
            <label>全局人设</label>
            <textarea rows="4" value={tempSettings.system_prompt} onChange={e => setTempSettings({ ...tempSettings, system_prompt: e.target.value })} placeholder="例如: 你是一个温柔、贴心的朋友..." />
            <label>温度（随机性，0~2）</label>
            <div className="slider-group">
              <input type="range" min="0" max="2" step="0.1" value={tempSettings.temperature} onChange={e => setTempSettings({ ...tempSettings, temperature: parseFloat(e.target.value) })} />
              <input type="number" step="0.1" value={tempSettings.temperature} onChange={e => setTempSettings({ ...tempSettings, temperature: parseFloat(e.target.value) })} />
            </div>
            <label>最大输出长度（tokens）</label>
            <div className="slider-group">
              <input type="range" min="100" max="8000" step="100" value={tempSettings.max_tokens} onChange={e => setTempSettings({ ...tempSettings, max_tokens: parseInt(e.target.value) })} />
              <input type="number" min="100" max="8000" step="100" value={tempSettings.max_tokens} onChange={e => setTempSettings({ ...tempSettings, max_tokens: parseInt(e.target.value) })} />
            </div>
            <div className="modal-buttons">
              <button onClick={saveGlobalSettings}>保存</button>
              <button onClick={() => setShowSettings(false)}>取消</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default App;

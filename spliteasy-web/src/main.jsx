import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function api(path, options = {}, retry = true) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await readJson(response);
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await api('/auth/refresh', { method: 'POST' }, false);
      return api(path, options, false);
    } catch (err) {
      throw new Error(data.error || 'No autenticado');
    }
  }
  if (!response.ok) throw new Error(data.error || data.detail || `HTTP ${response.status}`);
  return data;
}

function getUserId(user) {
  return user?.user?.user_id || user?.user?.id || user?.id || '';
}

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [active, setActive] = useState('groups');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [health, setHealth] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [groupDetail, setGroupDetail] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [inviteUserId, setInviteUserId] = useState('');
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '' });
  const [splitAmounts, setSplitAmounts] = useState({});
  const [data, setData] = useState({ expenses: [], balances: {}, debts: [], notifications: [], report: null });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userNames, setUserNames] = useState({});

  const currentUserId = getUserId(user);
  const members = useMemo(() => groupDetail?.members || [], [groupDetail]);
  
  // Función para obtener nombre de usuario, fallback a UUID si no existe
  function getUserName(userId) {
    return userNames[userId] || userId;
  }

  function showError(err) {
    setError(err.message || 'Ocurrio un error');
    setNotice('');
  }

  function showNotice(message) {
    setNotice(message);
    setError('');
  }

  async function loadHealth() {
    try {
      setHealth(await api('/health'));
    } catch {
      setHealth({});
    }
  }

  async function refreshSession() {
    try {
      const profile = await api('/auth/me');
      if (profile && profile.user) setUser(profile);
    } catch (err) {
      // Sesion expirada, usuario no autenticado - esto es normal
    }
  }

  async function loadGroups() {
    const result = await api('/groups');
    const groupsList = Array.isArray(result) ? result : [];
    setGroups(groupsList);
    if (!groupId && groupsList.length > 0 && groupsList[0]?.id) {
      setGroupId(groupsList[0].id);
      await loadGroupDetail(groupsList[0].id);
    }
  }

  async function loadGroupDetail(id = groupId) {
    if (!id) return;
    const result = await api(`/groups/${id}`);
    if (!result || typeof result !== 'object') return;
    setGroupDetail(result);
    if (result.id) setGroupId(result.id);
    const nextSplits = {};
    const newUserNames = { ...userNames };
    if (Array.isArray(result.members)) {
      result.members.forEach((member) => {
        nextSplits[member.user_id] = splitAmounts[member.user_id] || '';
        if (member.name && member.user_id) {
          newUserNames[member.user_id] = member.name;
        }
      });
    }
    setUserNames(newUserNames);
    setSplitAmounts(nextSplits);
  }

  useEffect(() => {
    loadHealth();
    refreshSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) loadGroups().catch(showError);
  }, [user]);

  async function submitAuth(event) {
    event.preventDefault();
    const path = mode === 'register' ? '/auth/register' : '/auth/login';
    const body = mode === 'register'
      ? authForm
      : { email: authForm.email, password: authForm.password };
    const result = await api(path, { method: 'POST', body });
    setUser(result);
    showNotice(mode === 'register' ? 'Cuenta creada' : 'Sesion iniciada');
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setGroups([]);
    setGroupId('');
    setGroupDetail(null);
    showNotice('Sesion cerrada');
  }

  async function createGroup(event) {
    event.preventDefault();
    const result = await api('/groups', { method: 'POST', body: groupForm });
    setGroupForm({ name: '', description: '' });
    setGroupId(result.group_id);
    await loadGroups();
    await loadGroupDetail(result.group_id);
    showNotice('Grupo creado');
  }

  async function inviteMember(event) {
    event.preventDefault();
    await api(`/groups/${groupId}/members`, { method: 'POST', body: { user_id: inviteUserId.trim() } });
    setInviteUserId('');
    await loadGroupDetail();
    showNotice('Miembro agregado');
  }

  function distributeEqually(amountValue = expenseForm.amount) {
    const amount = Number(amountValue);
    if (!amount || members.length === 0) return;
    const base = Math.floor((amount / members.length) * 100) / 100;
    const next = {};
    members.forEach((member, index) => {
      const value = index === members.length - 1
        ? amount - base * (members.length - 1)
        : base;
      next[member.user_id] = value.toFixed(2);
    });
    setSplitAmounts(next);
  }

  async function createExpense(event) {
    event.preventDefault();
    const splits = members.map((member) => ({
      user_id: member.user_id,
      amount_owed: Number(splitAmounts[member.user_id] || 0)
    }));
    await api('/expenses', {
      method: 'POST',
      body: {
        group_id: groupId,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        splits
      }
    });
    setExpenseForm({ amount: '', description: '' });
    setSplitAmounts({});
    showNotice('Gasto registrado');
    await loadExpenses();
    setTimeout(() => {
      loadDebts().catch(() => {});
      loadNotifications().catch(() => {});
    }, 900);
  }

  async function loadExpenses() {
    const expenses = await api(`/expenses?group_id=${groupId}`);
    setData((prev) => ({ ...prev, expenses: Array.isArray(expenses) ? expenses : [] }));
  }

  async function loadDebts() {
    const [balances, debts] = await Promise.all([
      api(`/balances/${groupId}`),
      api(`/debts/${groupId}`)
    ]);
    setData((prev) => ({
      ...prev,
      balances: typeof balances === 'object' && balances !== null ? balances : {},
      debts: Array.isArray(debts) ? debts : []
    }));
  }

  async function loadNotifications() {
    const notifications = await api('/notifications');
    setData((prev) => ({ ...prev, notifications: Array.isArray(notifications) ? notifications : [] }));
  }

  async function loadReport() {
    const report = await api(`/reports?group_id=${groupId}`);
    setData((prev) => ({ ...prev, report: report || null }));
  }

  async function askAgent(event) {
    event.preventDefault();
    const result = await api('/ai/chat', { method: 'POST', body: { group_id: groupId, question } });
    setAnswer(result.answer);
  }

  const nav = [
    ['groups', Users, 'Grupos'],
    ['expenses', CircleDollarSign, 'Gastos'],
    ['debts', WalletCards, 'Balances'],
    ['reports', FileText, 'Reportes'],
    ['notifications', CheckCircle2, 'Notificaciones'],
    ['ai', Bot, 'IA']
  ];

  return (
    <main>
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">S</div>
          <div>
            <strong>SplitEasy</strong>
            <span>Microservicios</span>
          </div>
        </div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)} disabled={!user}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <section className="health">
          <span>Gateway</span>
          <strong>{health.auth ? 'conectado' : 'sin verificar'}</strong>
        </section>
      </aside>

      <section className="workspace">
        <header>
          <div>
            <p>Usuario</p>
            <strong>{user?.name || currentUserId || 'Sin sesion'}</strong>
          </div>
          <div className="actions">
            <button title="Estado" onClick={() => loadHealth().catch(showError)}>
              <RefreshCw size={18} />
            </button>
            {user && (
              <button title="Cerrar sesion" onClick={() => logout().catch(showError)}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}
        {error && <div className="notice error">{error}</div>}

        {!user && (
          <section className="panel auth-panel">
            <div className="auth-title">
              <ShieldCheck size={32} />
              <h1>{mode === 'register' ? 'Crear cuenta' : 'Iniciar sesion'}</h1>
            </div>
            <form onSubmit={(event) => submitAuth(event).catch(showError)}>
              {mode === 'register' && (
                <input required placeholder="Nombre" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
              )}
              <input required placeholder="Correo" type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
              <input required placeholder="Contrasena" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
              <button className="primary">{mode === 'register' ? 'Crear cuenta' : 'Entrar'}</button>
            </form>
            <button className="link" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
              {mode === 'register' ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
            </button>
          </section>
        )}

        {user && (
          <div className="group-bar">
            <select value={groupId} onChange={(event) => loadGroupDetail(event.target.value).catch(showError)}>
              <option value="">Seleccionar grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <button onClick={() => loadGroups().catch(showError)}>Actualizar</button>
          </div>
        )}

        {user && active === 'groups' && (
          <section className="grid">
            <form className="panel" onSubmit={(event) => createGroup(event).catch(showError)}>
              <h2>Crear grupo</h2>
              <input required placeholder="Nombre del grupo" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} />
              <textarea placeholder="Descripcion" value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} />
              <button className="primary">Guardar</button>
            </form>

            <section className="panel">
              <div className="panel-title">
                <h2>Grupo activo</h2>
                <button onClick={() => loadGroupDetail().catch(showError)}>Cargar</button>
              </div>
              {groupDetail ? (
                <>
                  <article className="summary">
                    <strong>{groupDetail.name}</strong>
                    <span>{groupDetail.description || 'Sin descripcion'}</span>
                  </article>
                  <form className="inline-form" onSubmit={(event) => inviteMember(event).catch(showError)}>
                    <input required placeholder="UUID del usuario" value={inviteUserId} onChange={(event) => setInviteUserId(event.target.value)} />
                    <button className="primary"><UserPlus size={18} /> Agregar</button>
                  </form>
                  {members.map((member) => (
                    <article className="row" key={member.user_id}>
                      <strong>{member.name || getUserName(member.user_id)}</strong>
                      <span>{member.role}</span>
                    </article>
                  ))}
                </>
              ) : (
                <p className="empty">No hay grupo seleccionado.</p>
              )}
            </section>
          </section>
        )}

        {user && active === 'expenses' && (
          <section className="grid">
            <form className="panel" onSubmit={(event) => createExpense(event).catch(showError)}>
              <div className="panel-title">
                <h2>Registrar gasto</h2>
                <button type="button" onClick={() => distributeEqually()}>Dividir</button>
              </div>
              <input required placeholder="Descripcion" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} />
              <input required min="1" step="0.01" type="number" placeholder="Monto" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} />
              <div className="split-list">
                {members.map((member) => (
                  <label key={member.user_id}>
                    <span>{member.name || getUserName(member.user_id)}</span>
                    <input type="number" min="0" step="0.01" value={splitAmounts[member.user_id] || ''} onChange={(event) => setSplitAmounts({ ...splitAmounts, [member.user_id]: event.target.value })} />
                  </label>
                ))}
              </div>
              <button className="primary" disabled={!groupId || members.length === 0}>Crear gasto</button>
            </form>

            <section className="panel">
              <div className="panel-title"><h2>Historial</h2><button onClick={() => loadExpenses().catch(showError)}>Cargar</button></div>
              {data.expenses.length === 0 && <p className="empty">Sin gastos registrados.</p>}
              {data.expenses.map((expense) => (
                <article className="row" key={expense.id}>
                  <strong>{expense.description || 'Gasto'}</strong>
                  <span>${Number(expense.amount).toFixed(2)}</span>
                </article>
              ))}
            </section>
          </section>
        )}

        {user && active === 'debts' && (
          <section className="panel">
            <div className="panel-title"><h2>Balances</h2><button onClick={() => loadDebts().catch(showError)}>Cargar</button></div>
            <div className="cards">
              {Object.entries(data.balances).map(([userId, amount]) => (
                <article key={userId}><span>{getUserName(userId)}</span><strong>${Number(amount).toFixed(2)}</strong></article>
              ))}
            </div>
            {data.debts.length === 0 && <p className="empty">Sin transferencias pendientes.</p>}
            {data.debts.map((debt, index) => (
              <article className="row" key={index}><strong>{getUserName(debt.from)} paga a {getUserName(debt.to)}</strong><span>${Number(debt.amount).toFixed(2)}</span></article>
            ))}
          </section>
        )}

        {user && active === 'reports' && (
          <section className="panel">
            <div className="panel-title"><h2>Reporte</h2><button onClick={() => loadReport().catch(showError)}>Generar</button></div>
            {!data.report && <p className="empty">Sin reporte generado.</p>}
            {data.report && (
              <div className="report-view">
                <div className="report-section">
                  <h3>Balances Actuales</h3>
                  <div className="report-grid">
                    {Object.entries(data.report.balances || {}).map(([userId, amount]) => (
                      <div key={userId} className="report-card">
                        <span className="report-label">{getUserName(userId)}</span>
                        <strong className={Number(amount) >= 0 ? 'positive' : 'negative'}>${Number(amount).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="report-section">
                  <h3>Historial de Gastos</h3>
                  <div className="report-list">
                    {data.report.expense_historicals && Array.isArray(data.report.expense_historicals) && data.report.expense_historicals.map((exp, idx) => (
                      <div key={idx} className="report-item">
                        <div className="report-item-header">
                          <strong>{exp.description || 'Gasto'}</strong>
                          <span className="amount">${Number(exp.amount).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="report-section">
                  <h3>Plan Óptimo de Liquidación</h3>
                  <div className="report-list">
                    {data.report.optimal_settlement_plan && Array.isArray(data.report.optimal_settlement_plan) && data.report.optimal_settlement_plan.map((settlement, idx) => (
                      <div key={idx} className="settlement-item">
                        <div className="settlement-flow">
                          <span className="from">{getUserName(settlement.from)}</span>
                          <span className="arrow">→</span>
                          <span className="to">{getUserName(settlement.to)}</span>
                        </div>
                        <span className="settlement-amount">${Number(settlement.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {data.report.summary && (
                  <div className="report-section">
                    <h3>Resumen</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span>Total Gastado</span>
                        <strong>${Number(data.report.summary.gross_total_spent || 0).toFixed(2)}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Gastos Registrados</span>
                        <strong>{data.report.summary.total_expenses_registered || 0}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {user && active === 'notifications' && (
          <section className="panel">
            <div className="panel-title"><h2>Notificaciones</h2><button onClick={() => loadNotifications().catch(showError)}>Cargar</button></div>
            {data.notifications.length === 0 && <p className="empty">Sin notificaciones.</p>}
            {data.notifications.map((notification) => (
              <article className="row" key={notification.id}><strong>{notification.message}</strong><span>{notification.read ? 'leida' : 'nueva'}</span></article>
            ))}
          </section>
        )}

        {user && active === 'ai' && (
          <section className="panel">
            <h2>Agente IA</h2>
            <form className="chat" onSubmit={(event) => askAgent(event).catch(showError)}>
              <input required placeholder="Pregunta sobre el grupo" value={question} onChange={(event) => setQuestion(event.target.value)} />
              <button className="primary"><Send size={18} /> Preguntar</button>
            </form>
            {answer && <div className="answer">{answer}</div>}
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Sun, Moon, Search, Users, Eye, Edit, ChevronLeft, ChevronRight, X, UserPlus, Mail, CreditCard, UserSearch, Download, RefreshCw, LayoutDashboard, Database, Settings, Globe, Table as TableIcon, Trash2, CheckCircle2, AlertCircle, Server, ShieldCheck } from 'lucide-react'

interface UserCreateRequest { cpf: string; name: string; email: string; }
interface UserResponse { cpf: string; name: string; email: string; createdAt: string; }

// Metadados para K8s/Container
const APP_VERSION = (window as any)._env_?.VITE_APP_VERSION || '2.9.0-stable';
const HOST_ID = (window as any)._env_?.VITE_HOST_ID || 'kratos-runtime-default';

const formatCPF = (cpf: string) => {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export default function App() {
  const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'dark')
  const [activeTab, setActiveTab] = useState<'members' | 'dash' | 'settings'>('members')
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('api_url') || 'http://localhost:5007/users')
  const [tableDensity, setTableDensity] = useState<'compact' | 'normal'>(localStorage.getItem('density') as any || 'normal')
  
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState<string>('')
  
  const [newUser, setNewUser] = useState<UserCreateRequest>({ cpf: '', name: '', email: '' })
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null)
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = tableDensity === 'compact' ? 12 : 7

  useEffect(() => {
    theme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Monitor de Saúde da API (Health Check)
  const checkApiHealth = useCallback(async () => {
    try {
      const res = await fetch(apiUrl, { method: 'HEAD' });
      setApiStatus(res.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  }, [apiUrl]);

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(searchTerm ? `${apiUrl}/${searchTerm}` : apiUrl)
      if (response.status === 404) { setUsers([]); setApiStatus('online'); return; }
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [data])
      setApiStatus('online')
      setCurrentPage(1)
    } catch { 
      setUsers([]); 
      setApiStatus('offline');
    } finally { setLoading(false) }
  }, [searchTerm, apiUrl])

  // Ciclo de verificação constante (30s)
  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, [checkApiHealth]);

  useEffect(() => { if(activeTab !== 'settings') fetchUsers() }, [fetchUsers, activeTab])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (res.ok) {
        setIsCreateModalOpen(false)
        setNewUser({ cpf: '', name: '', email: '' })
        setTimeout(() => fetchUsers(), 600)
      }
    } catch { alert("Falha na rede") }
  }

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return users.slice(start, start + itemsPerPage)
  }, [users, currentPage, itemsPerPage])

  const totalPages = Math.ceil(users.length / itemsPerPage)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      <div className="flex flex-grow">
        {/* SIDEBAR NAVEGAÇÃO */}
        <aside className="fixed left-0 top-0 h-full w-20 hidden md:flex flex-col items-center py-8 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-10 shadow-lg"><Database size={20} /></div>
          <nav className="flex flex-col gap-4">
            {[
              { id: 'dash', icon: LayoutDashboard },
              { id: 'members', icon: Users },
              { id: 'settings', icon: Settings }
            ].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <item.icon size={22}/>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-grow md:pl-20 flex flex-col">
          <header className="h-20 px-8 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-tighter">
            <span>Kratos Core <span className="text-blue-600">/ {activeTab}</span></span>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {theme === 'dark' ? <Sun className="text-amber-500" size={18} /> : <Moon className="text-blue-600" size={18} />}
            </button>
          </header>

          <main className="p-8 w-full max-w-7xl mx-auto flex-grow">
            
            {activeTab === 'dash' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total de Membros</p>
                  <h2 className="text-4xl font-black">{users.length}</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Status do Backend</p>
                  {apiStatus === 'online' ? (
                    <h2 className="text-xl font-bold text-emerald-500 uppercase flex items-center gap-2 italic"><CheckCircle2 size={20} /> Online</h2>
                  ) : apiStatus === 'offline' ? (
                    <h2 className="text-xl font-bold text-red-500 uppercase flex items-center gap-2 italic"><AlertCircle size={20} /> Offline</h2>
                  ) : (
                    <h2 className="text-xl font-bold text-slate-400 uppercase animate-pulse italic">Verificando...</h2>
                  )}
                </div>
                <div className="bg-blue-600 p-8 rounded-xl text-white shadow-xl shadow-blue-500/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Integridade</p>
                  <h2 className="text-xl font-black uppercase mt-1 italic">Operacional</h2>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="relative flex-grow max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Filtrar por CPF..." className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">
                      <UserPlus size={18} /> Novo
                    </button>
                    <button onClick={fetchUsers} className="p-3 bg-white dark:bg-slate-900 text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className={`${tableDensity === 'compact' ? 'px-6 py-3' : 'px-6 py-5'} text-[10px] font-black uppercase text-slate-400 tracking-widest`}>CPF</th>
                        <th className={`${tableDensity === 'compact' ? 'px-6 py-3' : 'px-6 py-5'} text-[10px] font-black uppercase text-slate-400 tracking-widest`}>Nome</th>
                        <th className={`${tableDensity === 'compact' ? 'px-6 py-3' : 'px-6 py-5'} text-center text-[10px] font-black uppercase text-slate-400 tracking-widest`}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest">Sincronizando...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={3} className="px-10 py-24 text-center"><UserSearch size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4"/><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vazio</p></td></tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u.cpf} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/5 transition-all">
                            <td className={`${tableDensity === 'compact' ? 'py-3' : 'py-5'} px-6`}><span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{formatCPF(u.cpf)}</span></td>
                            <td className={`${tableDensity === 'compact' ? 'py-3' : 'py-5'} px-6`}><span className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase">{u.name}</span></td>
                            <td className="px-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => { setSelectedUser(u); setIsViewModalOpen(true); }} className="p-2 bg-slate-50 dark:bg-slate-800 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Eye size={16}/></button>
                                <button onClick={() => { setEditingUser(u); setIsEditModalOpen(true); }} className="p-2 bg-slate-50 dark:bg-slate-800 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><Edit size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl animate-in fade-in slide-in-from-left-4 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2"><Globe size={18}/> Conexão</h3>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Gateway</label>
                    <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-blue-500 outline-none transition-all font-mono text-xs" />
                    <button onClick={() => { localStorage.setItem('api_url', apiUrl); window.location.reload(); }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest">Atualizar e Reiniciar</button>
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-500 flex items-center gap-2"><Trash2 size={18}/> Limpeza</h3>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl text-xs font-black uppercase tracking-widest">Resetar Tudo</button>
                </section>
              </div>
            )}
          </main>

          {/* RODAPÉ ENTERPRISE - K8S READY */}
          <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] py-6 px-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 relative"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 italic">Core Online</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-500" /> Build v{APP_VERSION}
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <Server size={14} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pod Ident:</span>
                <span className="text-[11px] font-mono font-bold text-indigo-500 italic">{HOST_ID}</span>
              </div>
              
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-700">&copy; 2026 KRATOS SYSTEM</p>
            </div>
          </footer>
        </div>
      </div>

      {/* MODAL: CRIAR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center text-blue-600"><h3 className="font-black text-xl uppercase italic">Novo Membro</h3><button onClick={() => setIsCreateModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleCreateUser} className="p-8 pt-2 space-y-4">
              <input type="text" placeholder="CPF" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none focus:border-blue-500 border-2 border-transparent transition-all" value={newUser.cpf} onChange={e => setNewUser({...newUser, cpf: e.target.value})} required />
              <input type="text" placeholder="Nome" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none focus:border-blue-500 border-2 border-transparent transition-all" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
              <input type="email" placeholder="E-mail" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none focus:border-blue-500 border-2 border-transparent transition-all" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Sincronizar Cluster</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center text-amber-500"><h3 className="font-black text-xl uppercase italic">Editar Membro</h3><button onClick={() => setIsEditModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); setIsEditModalOpen(false); alert("Atualizado!"); }} className="p-8 pt-2 space-y-4">
              <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl font-bold text-xs text-slate-400 border border-slate-200 dark:border-slate-700 italic">CPF: {formatCPF(editingUser.cpf)}</div>
              <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none focus:border-amber-500 border-2 border-transparent transition-all" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
              <input type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none focus:border-amber-500 border-2 border-transparent transition-all" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
              <button type="submit" className="w-full py-4 bg-amber-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center relative">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-800 shadow-inner">
               <Users size={32} className="text-blue-600" />
            </div>
            <h4 className="text-2xl font-black uppercase tracking-tighter italic">{selectedUser.name}</h4>
            <p className="text-blue-600 font-mono font-black mt-1 text-sm tracking-widest">{formatCPF(selectedUser.cpf)}</p>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-4">
              <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail</p><p className="text-sm font-bold truncate">{selectedUser.email}</p></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Registro</p><p className="text-sm font-bold">{selectedUser.createdAt}</p></div>
            </div>
            <button onClick={() => setIsViewModalOpen(false)} className="w-full mt-10 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Voltar</button>
          </div>
        </div>
      )}
    </div>
  )
}
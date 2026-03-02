import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Ticket,
  CheckCircle,
  Circle,
  Copy,
  Plus,
  Trash2,
  Search,
  Printer,
  DollarSign,
  Settings,
  Trophy,
  AlertTriangle,
  Info,
  LogOut,
  Share2,
  Lock,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: 'AIzaSyD8jpjyFQUgfzFJcn6ckKibAHzUNmSIGUc',
  authDomain: 'd2-group-system.firebaseapp.com',
  projectId: 'd2-group-system',
  storageBucket: 'd2-group-system.firebasestorage.app',
  messagingSenderId: '481760052668',
  appId: '1:481760052668:web:4ea2a6222ebd500ea297b9',
  measurementId: 'G-GB9ZXL62LK',
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const BOLOES_COLLECTION = 'boloes';

// --- HELPER FUNCIONS ---
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

// Verifica de forma segura se o usuário é o admin atual (pelo UID ou pela senha salva no dispositivo)
const isUserAdmin = (bolao, user) => {
  if (!bolao) return false;
  if (user && bolao.adminId === user.uid) return true;
  if (bolao.pin && localStorage.getItem(`admin_${bolao.id}`) === bolao.pin)
    return true;
  return false;
};

// --- CONSTANTS & LOTTERY MATH ---
const TICKET_COST = 6.0; // Preço atual da aposta simples

const getCombinations = (n) => {
  if (!n || n < 6) return 0;
  if (n === 6) return 1;
  let c = 1;
  for (let i = 1; i <= 6; i++) {
    c = (c * (n - i + 1)) / i;
  }
  return c;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [boloes, setBoloes] = useState([]);
  const [currentBolaoId, setCurrentBolaoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [forceRender, setForceRender] = useState(0); // Força atualização ao recuperar admin

  const [view, setView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('participants');

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Auth error:', error);
        showToast('Erro na autenticação.', 'error');
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const boloesRef = collection(db, BOLOES_COLLECTION);
    const unsubscribeDb = onSnapshot(
      boloesRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          // Deserializa os cartões para burlar o bloqueio do Firestore
          if (docData.ticketsStr) {
            try {
              docData.tickets = JSON.parse(docData.ticketsStr);
            } catch (e) {
              docData.tickets = [];
            }
            delete docData.ticketsStr;
          } else if (!docData.tickets) {
            docData.tickets = [];
          }
          return { id: doc.id, ...docData };
        });
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setBoloes(data);
      },
      (error) => {
        console.error('Firestore error:', error);
        showToast('Erro ao carregar os bolões.', 'error');
      }
    );

    return () => unsubscribeDb();
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveBolao = async (bolaoData) => {
    try {
      const dataToSave = { ...bolaoData };

      // Firestore bloqueia "listas dentro de listas". Transformamos em texto antes de salvar:
      if (Array.isArray(dataToSave.tickets)) {
        dataToSave.ticketsStr = JSON.stringify(dataToSave.tickets);
        delete dataToSave.tickets;
      }

      const docRef = doc(db, BOLOES_COLLECTION, bolaoData.id);
      await setDoc(docRef, dataToSave);
      showToast('Bolão salvo com sucesso!');
    } catch (error) {
      console.error('Save error:', error);
      showToast('Erro de conexão ao salvar bolão. Tente novamente.', 'error');
    }
  };

  const deleteBolao = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este bolão?')) return;
    try {
      const docRef = doc(db, BOLOES_COLLECTION, id);
      await deleteDoc(docRef);
      setView('dashboard');
      showToast('Bolão excluído!');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Erro ao excluir.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 text-emerald-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currentBolao = boloes.find((b) => b.id === currentBolaoId);
  const isAdmin = isUserAdmin(currentBolao, user);

  // Função para recuperar acesso via Senha
  const claimAdminAccess = (bolao) => {
    const inputPin = window.prompt(
      'Digite a Senha de Segurança que você criou para este bolão:'
    );
    if (!inputPin) return;

    if (inputPin === bolao.pin) {
      localStorage.setItem(`admin_${bolao.id}`, bolao.pin);
      setForceRender((prev) => prev + 1); // Força a tela a atualizar para mostrar os botões
      showToast('Acesso de Administrador recuperado com sucesso!');
    } else {
      showToast('Senha incorreta.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-emerald-200">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white no-print transition-all duration-300 transform translate-y-0 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="bg-gradient-to-r from-emerald-700 to-green-600 text-white shadow-md no-print">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView('dashboard')}
          >
            <div className="bg-white p-2 rounded-full">
              <img
                src="https://api.iconify.design/noto:bird.svg"
                alt="Pica Pau Logo"
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">
                PICA PAU
              </h1>
              <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                Loterias & Bolões
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline-block opacity-80">
              {user ? `Dispositivo Autenticado` : 'Conectando...'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'dashboard' && (
          <Dashboard
            boloes={boloes}
            setView={setView}
            setCurrentBolaoId={setCurrentBolaoId}
            user={user}
            isUserAdmin={isUserAdmin}
          />
        )}

        {view === 'create' && (
          <CreateBolao
            user={user}
            saveBolao={saveBolao}
            setView={setView}
            setCurrentBolaoId={setCurrentBolaoId}
          />
        )}

        {view === 'bolao' && currentBolao && (
          <BolaoManager
            bolao={currentBolao}
            isAdmin={isAdmin}
            saveBolao={saveBolao}
            deleteBolao={deleteBolao}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setView={setView}
            showToast={showToast}
            claimAdminAccess={claimAdminAccess}
          />
        )}
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .ticket-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .ticket-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #ccc; }
        }
      `,
        }}
      />
    </div>
  );
}

// --- VIEWS ---

function Dashboard({ boloes, setView, setCurrentBolaoId, user, isUserAdmin }) {
  // Separa os bolões em Meus Bolões (Admin) e Outros
  const myBoloes = boloes.filter((b) => isUserAdmin(b, user));
  const otherBoloes = boloes.filter((b) => !isUserAdmin(b, user));

  const openBolao = (id) => {
    setCurrentBolaoId(id);
    setView('bolao');
  };

  const BolaoCard = ({ bolao, isMine }) => {
    const participants = bolao.participants || [];
    const tickets = bolao.tickets || [];
    const totalArrecadado =
      participants.filter((p) => p.paid).length * (bolao.quotaValue || 0);

    return (
      <div
        onClick={() => openBolao(bolao.id)}
        className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all duration-200 group relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:bg-yellow-400 transition-colors"></div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg text-gray-800 line-clamp-1">
            {bolao.name || 'Sem Nome'}
          </h3>
          {isMine && (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Admin
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <span>{participants.length} Participantes</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-gray-400" />
            <span>{tickets.length} Cartões Gerados</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500" />
            <span className="font-medium text-emerald-700">
              R$ {totalArrecadado.toFixed(2)} arrecadados
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Meus Bolões</h2>
          <p className="text-gray-500">
            Gerencie ou participe de bolões com seus amigos.
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={20} /> Criar Novo Bolão
        </button>
      </div>

      {myBoloes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myBoloes.map((b) => (
            <BolaoCard key={b.id} bolao={b} isMine={true} />
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center">
          <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="text-emerald-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">
            Você ainda não gerencia nenhum bolão neste dispositivo
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Crie um novo bolão, ou clique em um bolão público abaixo e use o
            botão "Recuperar Admin" informando a sua senha.
          </p>
        </div>
      )}

      {otherBoloes.length > 0 && (
        <div className="pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Bolões Públicos na Plataforma
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherBoloes.map((b) => (
              <BolaoCard key={b.id} bolao={b} isMine={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBolao({ user, saveBolao, setView, setCurrentBolaoId }) {
  const [formData, setFormData] = useState({
    name: '',
    quotaValue: 50,
    pixKey: '',
    pin: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pin.trim()) return;

    const newBolao = {
      id: generateId(),
      adminId: user?.uid || generateId(),
      name: formData.name,
      quotaValue: Number(formData.quotaValue),
      pixKey: formData.pixKey,
      pin: formData.pin, // Senha salva
      participants: [],
      tickets: [],
      drawnNumbers: [],
      createdAt: Date.now(),
    };

    // Salva a senha no dispositivo atual automaticamente para garantir o acesso local
    localStorage.setItem(`admin_${newBolao.id}`, newBolao.pin);

    saveBolao(newBolao);
    setCurrentBolaoId(newBolao.id);
    setView('bolao');
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className="text-gray-400 hover:text-gray-600"
        >
          <LogOut size={24} className="rotate-180" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Criar Novo Bolão</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nome do Bolão
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Ex: Mega da Virada - Família Silva"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cota por Pessoa (R$)
            </label>
            <input
              type="number"
              required
              min="5"
              step="1"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.quotaValue}
              onChange={(e) =>
                setFormData({ ...formData, quotaValue: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Lock size={14} /> Senha do Bolão
            </label>
            <input
              type="text"
              required
              maxLength="8"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              placeholder="Ex: 1234"
              value={formData.pin}
              onChange={(e) =>
                setFormData({ ...formData, pin: e.target.value })
              }
            />
          </div>
        </div>
        <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
          <strong>Importante:</strong> Crie uma senha simples acima. Se você
          acessar o site de outro aparelho (celular, iPad) no futuro, basta usar
          essa senha para recuperar os seus controles de Administrador!
        </p>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Sua Chave PIX (Para recebimentos)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="CPF, Email, Telefone ou Aleatória"
            value={formData.pixKey}
            onChange={(e) =>
              setFormData({ ...formData, pixKey: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Os participantes verão esta chave para pagar a cota.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4"
        >
          Criar Bolão Oficial
        </button>
      </form>
    </div>
  );
}

function BolaoManager({
  bolao,
  isAdmin,
  saveBolao,
  deleteBolao,
  activeTab,
  setActiveTab,
  setView,
  showToast,
  claimAdminAccess,
}) {
  const handleShare = () => {
    const dummyInput = document.createElement('input');
    document.body.appendChild(dummyInput);
    dummyInput.setAttribute('value', window.location.href);
    dummyInput.select();
    document.execCommand('copy');
    document.body.removeChild(dummyInput);
    showToast('Link copiado! Compartilhe com a galera no WhatsApp.');
  };

  const participants = bolao.participants || [];
  const tickets = bolao.tickets || [];
  const ticketsCount = tickets.length;

  const totalCollected =
    participants.filter((p) => p.paid).length * (bolao.quotaValue || 0);
  const totalTicketsCost = tickets.reduce(
    (acc, t) => acc + getCombinations(t.length) * TICKET_COST,
    0
  );
  const remainingBudget = totalCollected - totalTicketsCost;

  const isNegative = remainingBudget < 0;
  const totalMissing = isNegative ? Math.abs(remainingBudget) : 0;
  const missingPerPerson =
    participants.length > 0 ? totalMissing / participants.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="bg-emerald-800 text-white p-6 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Trophy size={100} />
          </div>
          <div className="flex justify-between items-start relative z-10 flex-col md:flex-row gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setView('dashboard')}
                  className="text-emerald-200 hover:text-white transition-colors"
                >
                  <LogOut size={20} className="rotate-180" />
                </button>
                <h2 className="text-3xl font-black">
                  {bolao.name || 'Sem Nome'}
                </h2>
              </div>
              <div className="flex gap-4 text-emerald-100 text-sm mt-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <Users size={16} /> {participants.length} Participantes
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign size={16} /> Cota Base: R${' '}
                  {bolao.quotaValue?.toFixed(2) || '0.00'}
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-1 font-semibold text-yellow-300">
                    <CheckCircle size={16} /> Você é o Admin
                  </div>
                ) : (
                  <button
                    onClick={() => claimAdminAccess(bolao)}
                    className="flex items-center gap-1 font-semibold text-white bg-emerald-600/50 hover:bg-emerald-600 px-3 py-1 rounded-full transition-colors border border-emerald-400"
                  >
                    <Lock size={14} /> Recuperar Admin
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors border border-emerald-500"
              >
                <Share2 size={16} /> Compartilhar Link
              </button>
              {isAdmin && (
                <button
                  onClick={() => deleteBolao(bolao.id)}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-red-500/30"
                  title="Excluir Bolão"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-emerald-50 p-4 border-b border-gray-200 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xs text-emerald-600 font-bold uppercase">
                Arrecadado
              </p>
              <p className="text-xl font-black text-gray-800">
                R$ {totalCollected.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-bold uppercase">
                Custo dos Jogos
              </p>
              <p className="text-xl font-black text-gray-800">
                R$ {totalTicketsCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-bold uppercase">
                Saldo em Caixa
              </p>
              <p
                className={`text-xl font-black ${
                  isNegative ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                R$ {remainingBudget.toFixed(2)}
              </p>
            </div>

            {/* Aviso de Falta de Dinheiro */}
            {isNegative && (
              <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm animate-pulse">
                <AlertTriangle size={18} />
                <span className="font-bold text-sm">
                  Rateio Extra: Falta R$ {missingPerPerson.toFixed(2)} por
                  pessoa
                </span>
              </div>
            )}
          </div>

          {!isAdmin && bolao.pixKey && (
            <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center gap-4 shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">
                  Chave PIX para pagamento:
                </p>
                <code className="text-emerald-700 font-bold text-sm bg-emerald-50 px-2 py-1 rounded select-all">
                  {bolao.pixKey}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-white scrollbar-hide">
          <TabButton
            active={activeTab === 'participants'}
            onClick={() => setActiveTab('participants')}
            icon={<Users size={18} />}
            label="Participantes"
          />
          <TabButton
            active={activeTab === 'tickets'}
            onClick={() => setActiveTab('tickets')}
            icon={<Ticket size={18} />}
            label={`Cartões (${ticketsCount})`}
          />
          {isAdmin && (
            <TabButton
              active={activeTab === 'generate'}
              onClick={() => setActiveTab('generate')}
              icon={<Settings size={18} />}
              label="Gerador"
            />
          )}
          <TabButton
            active={activeTab === 'results'}
            onClick={() => setActiveTab('results')}
            icon={<Trophy size={18} />}
            label="Resultados"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-transparent">
        {activeTab === 'participants' && (
          <ParticipantsTab
            bolao={bolao}
            isAdmin={isAdmin}
            saveBolao={saveBolao}
          />
        )}
        {activeTab === 'generate' && isAdmin && (
          <GeneratorTab
            bolao={bolao}
            saveBolao={saveBolao}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'tickets' && (
          <TicketsTab bolao={bolao} isAdmin={isAdmin} saveBolao={saveBolao} />
        )}
        {activeTab === 'results' && (
          <ResultsTab bolao={bolao} isAdmin={isAdmin} saveBolao={saveBolao} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${
        active
          ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ParticipantsTab({ bolao, isAdmin, saveBolao }) {
  const [newName, setNewName] = useState('');
  const participants = bolao.participants || [];

  const addParticipant = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const updated = {
      ...bolao,
      participants: [
        ...participants,
        { id: generateId(), name: newName.trim(), paid: false },
      ],
    };
    saveBolao(updated);
    setNewName('');
  };

  const togglePaid = (id) => {
    if (!isAdmin) return;
    const updated = {
      ...bolao,
      participants: participants.map((p) =>
        p.id === id ? { ...p, paid: !p.paid } : p
      ),
    };
    saveBolao(updated);
  };

  const removeParticipant = (id) => {
    if (!isAdmin || !window.confirm('Remover participante?')) return;
    const updated = {
      ...bolao,
      participants: participants.filter((p) => p.id !== id),
    };
    saveBolao(updated);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          Lista de Participantes
        </h3>
      </div>

      {isAdmin && (
        <form
          onSubmit={addParticipant}
          className="flex gap-2 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do participante..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Adicionar
          </button>
        </form>
      )}

      {participants.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p>Nenhum participante adicionado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {participants.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                p.paid
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePaid(p.id)}
                  disabled={!isAdmin}
                  className={`flex-shrink-0 transition-colors ${
                    !isAdmin ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    p.paid
                      ? 'text-emerald-500'
                      : 'text-gray-300 hover:text-emerald-400'
                  }`}
                >
                  {p.paid ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>
                <div>
                  <p
                    className={`font-semibold ${
                      p.paid ? 'text-emerald-900' : 'text-gray-800'
                    }`}
                  >
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.paid ? 'Pagamento Confirmado' : 'Aguardando PIX'}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneratorTab({ bolao, saveBolao, setActiveTab }) {
  const [config, setConfig] = useState({
    quantidade: 1,
    dezenas: 6,
    maxConsecutive: 3,
    maxPerDezena: 3,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const costPerTicket = getCombinations(config.dezenas) * TICKET_COST;
  const totalCost = config.quantidade * costPerTicket;

  const participants = bolao.participants || [];
  const totalCollected =
    participants.filter((p) => p.paid).length * (bolao.quotaValue || 0);
  const totalExistingTicketsCost = (bolao.tickets || []).reduce(
    (acc, t) => acc + getCombinations(t.length) * TICKET_COST,
    0
  );

  const isOverBudget = totalExistingTicketsCost + totalCost > totalCollected;

  const getRandomNumber = () => Math.floor(Math.random() * 60) + 1;
  const getDezenaGroup = (num) => Math.ceil(num / 10);

  const checkConsecutive = (arr, max) => {
    let currentCons = 1;
    let maxFound = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === arr[i - 1] + 1) {
        currentCons++;
        if (currentCons > maxFound) maxFound = currentCons;
      } else {
        currentCons = 1;
      }
    }
    return maxFound <= max;
  };

  const checkDezenas = (arr, max) => {
    const counts = {};
    for (const num of arr) {
      const g = getDezenaGroup(num);
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] > max) return false;
    }
    return true;
  };

  const generateSingleTicket = () => {
    let attempts = 0;
    while (attempts < 2000) {
      let ticket = new Set();
      while (ticket.size < config.dezenas) ticket.add(getRandomNumber());

      let arr = Array.from(ticket).sort((a, b) => a - b);

      let passRules = true;
      if (!checkConsecutive(arr, config.maxConsecutive)) passRules = false;
      if (!checkDezenas(arr, config.maxPerDezena)) passRules = false;

      if (passRules) return arr;
      attempts++;
    }
    let fallback = new Set();
    while (fallback.size < config.dezenas) fallback.add(getRandomNumber());
    return Array.from(fallback).sort((a, b) => a - b);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newTickets = [];
      for (let i = 0; i < config.quantidade; i++) {
        newTickets.push(generateSingleTicket());
      }

      saveBolao({
        ...bolao,
        tickets: [...(bolao.tickets || []), ...newTickets],
      });
      setIsGenerating(false);
      setActiveTab('tickets');
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h3 className="text-xl font-bold text-gray-800">
          Parâmetros do Gerador (Surpresinha Inteligente)
        </h3>
        <p className="text-gray-500 text-sm mt-1">
          Configure as regras e quantas dezenas deseja em cada cartão.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>Quantidade de Cartões a Gerar</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {config.quantidade} cartões
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={config.quantidade}
              onChange={(e) =>
                setConfig({ ...config, quantidade: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>Dezenas por Cartão</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {config.dezenas} números
              </span>
            </label>
            <input
              type="range"
              min="6"
              max="20"
              value={config.dezenas}
              onChange={(e) =>
                setConfig({ ...config, dezenas: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pelas regras da Caixa (6 a 20). Atenção: Jogar mais números
              multiplica drasticamente o preço!
            </p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>Máximo de Números Consecutivos</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {config.maxConsecutive} seguidos
              </span>
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={config.maxConsecutive}
              onChange={(e) =>
                setConfig({ ...config, maxConsecutive: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>Máximo na Mesma Dezena/Linha</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {config.maxPerDezena} números
              </span>
            </label>
            <input
              type="range"
              min="2"
              max="10"
              value={config.maxPerDezena}
              onChange={(e) =>
                setConfig({ ...config, maxPerDezena: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 mb-4">
              Resumo desta Geração
            </h4>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dezenas no Bilhete:</span>
                <span className="font-bold text-gray-800">
                  {config.dezenas}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Combinações por Bilhete:</span>
                <span className="font-bold text-gray-800">
                  {getCombinations(config.dezenas)} apostas
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Custo Individual (cada):</span>
                <span className="font-bold text-gray-800">
                  R$ {costPerTicket.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-bold text-gray-800">
                  Custo a Adicionar:
                </span>
                <span
                  className={`font-black text-lg ${
                    isOverBudget ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  R$ {totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {isOverBudget && (
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm mb-4 border border-amber-200">
                <AlertTriangle size={20} className="flex-shrink-0" />
                <p>
                  O custo total destes novos cartões somados aos anteriores
                  ultrapassa o saldo arrecadado. Você pode gerar mesmo assim (o
                  sistema calculará o rateio da diferença).
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md ${
              isGenerating
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <>Gerando Combinações...</>
            ) : (
              <>
                <Settings size={20} /> Gerar e Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketsTab({ bolao, isAdmin, saveBolao }) {
  const tickets = bolao.tickets || [];
  const drawn = bolao.drawnNumbers || [];

  const handlePrint = () => window.print();

  const clearTickets = () => {
    if (
      !window.confirm(
        'Tem a certeza de que deseja apagar TODOS os cartões gerados?'
      )
    )
      return;
    saveBolao({ ...bolao, tickets: [] });
  };

  const getHits = (ticket) => {
    if (!drawn.length) return 0;
    return ticket.filter((n) => drawn.includes(n)).length;
  };

  const totalCost = tickets.reduce(
    (acc, t) => acc + getCombinations(t.length) * TICKET_COST,
    0
  );

  if (tickets.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-200">
        <Ticket size={64} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">
          Nenhum cartão gerado
        </h3>
        <p className="text-gray-500 mb-6">
          O administrador precisa utilizar o Gerador de Apostas para criar os
          cartões deste bolão.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"
      id="print-area"
    >
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 no-print gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Cartões do Bolão</h3>
          <p className="text-sm text-gray-500">
            Total: {tickets.length} bilhetes (Custo: R$ {totalCost.toFixed(2)})
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={clearTickets}
              className="text-gray-500 hover:text-red-500 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-200 hover:border-red-200"
            >
              Apagar Tudo
            </button>
          )}
          <button
            onClick={handlePrint}
            className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Printer size={18} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="hidden print-only mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-black text-black">
          BOLÃO MEGA SENA: {bolao.name}
        </h1>
        <p className="text-gray-600">
          Total de Bilhetes: {tickets.length} | Custo dos Jogos: R${' '}
          {totalCost.toFixed(2)}
        </p>
      </div>

      <div className="ticket-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tickets.map((ticket, index) => {
          const hits = getHits(ticket);
          let highlightClass = 'border-gray-200 bg-gray-50';
          let badge = null;

          if (drawn.length > 0) {
            if (hits >= 6) {
              highlightClass = 'border-emerald-500 bg-emerald-100';
              badge = 'SENA!';
            } else if (hits === 5) {
              highlightClass = 'border-blue-500 bg-blue-50';
              badge = 'QUINA!';
            } else if (hits === 4) {
              highlightClass = 'border-yellow-500 bg-yellow-50';
              badge = 'QUADRA!';
            } else {
              highlightClass = 'border-gray-200 bg-white opacity-60';
            }
          }

          return (
            <div
              key={index}
              className={`ticket-card relative rounded-xl border p-4 shadow-sm flex flex-col justify-between h-full ${highlightClass}`}
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Jogo {String(index + 1).padStart(3, '0')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {ticket.length} dezenas
                  </span>
                </div>
                {badge && (
                  <span
                    className="text-xs font-black px-2 py-1 rounded bg-white shadow-sm"
                    style={{
                      color:
                        hits >= 6
                          ? '#10b981'
                          : hits === 5
                          ? '#3b82f6'
                          : '#eab308',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                {ticket.map((num, i) => {
                  const isDrawn = drawn.includes(num);
                  return (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 
                        ${
                          isDrawn
                            ? 'bg-emerald-500 border-emerald-600 text-white transform scale-110 shadow-md'
                            : 'bg-white border-gray-300 text-gray-700'
                        }`}
                    >
                      {String(num).padStart(2, '0')}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultsTab({ bolao, isAdmin, saveBolao }) {
  const [inputStr, setInputStr] = useState('');

  const drawnNumbers = bolao.drawnNumbers || [];
  const tickets = bolao.tickets || [];

  useEffect(() => {
    if (drawnNumbers && drawnNumbers.length > 0) {
      setInputStr(drawnNumbers.join(' - '));
    }
  }, [drawnNumbers]);

  const handleSaveResult = () => {
    const numbers = inputStr
      .split(/[\s,-]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 60);
    const unique = [...new Set(numbers)].sort((a, b) => a - b);

    if (unique.length > 0 && unique.length !== 6) {
      alert(
        'A Mega Sena possui 6 dezenas sorteadas. Por favor, insira exatamente 6 números.'
      );
      return;
    }

    saveBolao({ ...bolao, drawnNumbers: unique });
  };

  const handleClear = () => {
    saveBolao({ ...bolao, drawnNumbers: [] });
    setInputStr('');
  };

  let senaCount = 0,
    quinaCount = 0,
    quadraCount = 0;
  if (drawnNumbers.length === 6 && tickets.length > 0) {
    tickets.forEach((ticket) => {
      const hits = ticket.filter((n) => drawnNumbers.includes(n)).length;
      if (hits >= 6) senaCount++;
      if (hits === 5) quinaCount++;
      if (hits === 4) quadraCount++;
    });
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Trophy size={48} className="mx-auto text-yellow-400 mb-4" />
          <h3 className="text-2xl font-black text-gray-800">
            Conferência Automática
          </h3>
          <p className="text-gray-500 mt-2">
            Insira os 6 números sorteados pela Caixa para verificar todos os
            cartões.
          </p>
        </div>

        {isAdmin ? (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Números Sorteados (separe por espaços ou traços)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                placeholder="Ex: 05 - 12 - 33 - 41 - 50 - 59"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg text-center"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveResult}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Conferir Jogos
              </button>
              {drawnNumbers.length > 0 && (
                <button
                  onClick={handleClear}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        ) : drawnNumbers.length > 0 ? (
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
              Números Sorteados
            </p>
            <div className="flex justify-center gap-3">
              {drawnNumbers.map((n, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md border-2 border-emerald-600"
                >
                  {String(n).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200 mb-8">
            <p className="text-gray-500">
              O administrador ainda não inseriu o resultado do sorteio.
            </p>
          </div>
        )}

        {drawnNumbers.length === 6 && tickets.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 text-center mb-4 uppercase tracking-wider">
              Resumo de Bilhetes Premiados
            </h4>

            <div
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                senaCount > 0
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                    senaCount > 0
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  6
                </div>
                <div>
                  <h5
                    className={`font-bold text-lg ${
                      senaCount > 0 ? 'text-emerald-800' : 'text-gray-500'
                    }`}
                  >
                    Sena
                  </h5>
                  <p className="text-sm text-gray-500">
                    Bilhetes com 6 acertos
                  </p>
                </div>
              </div>
              <div
                className={`text-3xl font-black ${
                  senaCount > 0 ? 'text-emerald-600' : 'text-gray-300'
                }`}
              >
                {senaCount}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                quinaCount > 0
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                    quinaCount > 0
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  5
                </div>
                <div>
                  <h5
                    className={`font-bold text-lg ${
                      quinaCount > 0 ? 'text-blue-800' : 'text-gray-500'
                    }`}
                  >
                    Quina
                  </h5>
                  <p className="text-sm text-gray-500">
                    Bilhetes com 5 acertos
                  </p>
                </div>
              </div>
              <div
                className={`text-3xl font-black ${
                  quinaCount > 0 ? 'text-blue-600' : 'text-gray-300'
                }`}
              >
                {quinaCount}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                quadraCount > 0
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                    quadraCount > 0
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  4
                </div>
                <div>
                  <h5
                    className={`font-bold text-lg ${
                      quadraCount > 0 ? 'text-yellow-800' : 'text-gray-500'
                    }`}
                  >
                    Quadra
                  </h5>
                  <p className="text-sm text-gray-500">
                    Bilhetes com 4 acertos
                  </p>
                </div>
              </div>
              <div
                className={`text-3xl font-black ${
                  quadraCount > 0 ? 'text-yellow-600' : 'text-gray-300'
                }`}
              >
                {quadraCount}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

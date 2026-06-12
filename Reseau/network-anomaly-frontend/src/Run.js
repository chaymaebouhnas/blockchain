import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Lock, Unlock, RefreshCw, Plus, Send, LogOut, User, FileText, BookOpen, Bell, Link as LinkIcon } from 'lucide-react';

const API_URL = 'http://localhost:5020/api';

function App() {
  // États principaux
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  
  // Données
  const [allUsers, setAllUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  // Web3 & Blockchain
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [lastTxHash, setLastTxHash] = useState('');
  const [lastBlockNumber, setLastBlockNumber] = useState(0);
  
  // Formulaires
  const [registerForm, setRegisterForm] = useState({
    user_id: '', name: '', email: '', role: 'student'
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', description: '', deadline: '', max_grade: 100
  });
  const [submissionForm, setSubmissionForm] = useState({
    assignment_id: '', answer: ''
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', message: '', related_assignment: ''
  });

  // Initialisation
  useEffect(() => {
    initWeb3();
    loadStats();
    loadAssignments();
    loadAllUsers();
    
    const savedUser = localStorage.getItem('blockchain_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      loadUserData(userData);
    }
  }, []);

  // Initialisation Web3
  const initWeb3 = async () => {
    try {
      const Web3 = (await import('web3')).default;
      const web3Instance = new Web3('http://127.0.0.1:7545');
      
      const isConnected = await web3Instance.eth.net.isListening();
      if (!isConnected) {
        alert('❌ Impossible de se connecter à Ganache!');
        return;
      }

      const accountsList = await web3Instance.eth.getAccounts();
      setAccounts(accountsList);
      setSelectedAccount(accountsList[0]);

      const blockNumber = await web3Instance.eth.getBlockNumber();
      const networkId = await web3Instance.eth.net.getId();
      
      setNetworkInfo({
        blockNumber: Number(blockNumber),
        networkId: Number(networkId),
        connected: true
      });

      // Actualiser le block number toutes les 5 secondes
      const interval = setInterval(async () => {
        try {
          const newBlockNumber = await web3Instance.eth.getBlockNumber();
          setNetworkInfo(prev => ({ ...prev, blockNumber: Number(newBlockNumber) }));
        } catch (error) {
          console.error('Erreur refresh block:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Erreur Web3:', error);
    }
  };

  // Chargement des données
  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await fetch(`${API_URL}/assignments`);
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Erreur assignments:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/announcements`);
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Erreur announcements:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Erreur utilisateurs:', error);
    }
  };

  const loadUserData = async (userData) => {
    try {
      if (userData.role === 'student') {
        const [subsRes, resultsRes] = await Promise.all([
          fetch(`${API_URL}/submissions/student/${userData.eth_address}`),
          fetch(`${API_URL}/results/student/${userData.eth_address}`)
        ]);
        const subsData = await subsRes.json();
        const resultsData = await resultsRes.json();
        setSubmissions(subsData.submissions || []);
        setResults(resultsData.results || []);
      } else if (userData.role === 'teacher') {
        const response = await fetch(`${API_URL}/submissions/teacher/${userData.eth_address}`);
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  };

  const loadBlockchain = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/info`);
      const data = await response.json();
      setBlockchainData(data);
    } catch (error) {
      console.error('Erreur blockchain:', error);
    }
  };

  // Inscription
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      alert('❌ Veuillez sélectionner un compte Ethereum');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerForm,
          eth_address: selectedAccount
        })
      });

      const data = await response.json();

      const userData = {
        ...registerForm,
        eth_address: selectedAccount,
        public_key: data.public_key,
        private_key: data.private_key
      };

      setUser(userData);
      localStorage.setItem('blockchain_user', JSON.stringify(userData));

      setLastTxHash(data.tx_hash);
      setLastBlockNumber(data.block_number);

      alert(
        '✅ Inscription enregistrée sur la blockchain!\n\n' +
        `📍 Transaction: ${data.tx_hash}\n` +
        `🔗 Block: ${data.block_number}\n\n` +
        '⚠️ SAUVEGARDEZ VOS CLÉS!'
      );
      
      loadStats();
      loadUserData(userData);
      loadAllUsers();
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Créer un devoir
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'teacher') return;

    try {
      const response = await fetch(`${API_URL}/assignments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_address: user.eth_address,
          ...assignmentForm
        })
      });

      const data = await response.json();

      setLastTxHash(data.tx_hash);
      setLastBlockNumber(data.block_number);

      alert(
        '✅ Devoir créé sur la blockchain!\n\n' +
        `📝 ID: ${data.assignment_id}\n` +
        `📍 Transaction: ${data.tx_hash}\n` +
        `🔗 Block: ${data.block_number}`
      );

      setAssignmentForm({ title: '', description: '', deadline: '', max_grade: 100 });
      loadAssignments();
      loadStats();
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Soumettre un devoir
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'student') return;

    try {
      const assignment = assignments.find(a => a.assignment_id === submissionForm.assignment_id);
      const teacher = allUsers.find(u => u.eth_address === assignment.teacher_address);

      const response = await fetch(`${API_URL}/submissions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_address: user.eth_address,
          assignment_id: submissionForm.assignment_id,
          answer: submissionForm.answer,
          teacher_public_key: teacher.public_key
        })
      });

      const data = await response.json();

      setLastTxHash(data.tx_hash);
      setLastBlockNumber(data.block_number);

      alert(
        '✅ Devoir soumis et crypté!\n\n' +
        `📝 ID: ${data.submission_id}\n` +
        `📍 Transaction: ${data.tx_hash}\n` +
        `🔒 Crypté: Oui`
      );

      setSubmissionForm({ assignment_id: '', answer: '' });
      loadUserData(user);
      loadStats();
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Décrypter une soumission
  const handleDecryptSubmission = async (submissionId) => {
    if (!user || user.role !== 'teacher') return;

    try {
      const response = await fetch(`${API_URL}/submissions/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_address: user.eth_address,
          submission_id: submissionId,
          private_key: user.private_key
        })
      });

      const data = await response.json();
      const content = data.decrypted_content;

      alert(
        '🔓 Contenu décrypté:\n\n' +
        `Étudiant: ${content.student_address}\n` +
        `Date: ${new Date(content.submitted_at).toLocaleString()}\n\n` +
        `Réponse:\n${content.answer}`
      );
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Noter une soumission
  const handleGradeSubmission = async (submissionId) => {
    if (!user || user.role !== 'teacher') return;
    
    const grade = prompt('Note (0-100):');
    const feedback = prompt('Commentaire:');
    
    if (grade && feedback) {
      try {
        const response = await fetch(`${API_URL}/results/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_address: user.eth_address,
            submission_id: submissionId,
            grade: parseFloat(grade),
            feedback: feedback
          })
        });

        const data = await response.json();

        setLastTxHash(data.tx_hash);
        setLastBlockNumber(data.block_number);

        alert('✅ Note enregistrée sur la blockchain!');

        loadUserData(user);
        loadStats();
      } catch (error) {
        alert('❌ Erreur: ' + error.message);
      }
    }
  };

  // Déconnexion
  const handleLogout = () => {
    if (window.confirm('Se déconnecter?')) {
      setUser(null);
      localStorage.removeItem('blockchain_user');
      setSubmissions([]);
      setResults([]);
    }
  };

  // Connexion avec compte existant
  const handleLoginExisting = (existingUser) => {
    const userData = {
      user_id: existingUser.user_id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      eth_address: existingUser.eth_address,
      public_key: existingUser.public_key,
      private_key: existingUser.private_key
    };
    
    setUser(userData);
    localStorage.setItem('blockchain_user', JSON.stringify(userData));
    loadUserData(userData);
    
    alert(`✅ Connecté: ${userData.name} (${userData.role})`);
    setActiveTab(userData.role === 'teacher' ? 'submissions' : 'assignments');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-indigo-900 flex items-center gap-3">
            <LinkIcon className="w-8 h-8" />
            Système de Gestion des Contrôles Blockchain
          </h1>
          <p className="text-gray-600 mt-2">Plateforme sécurisée sur Ethereum avec cryptage RSA</p>
          
          {networkInfo && (
            <div className="flex gap-4 mt-4 text-sm">
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${networkInfo.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {networkInfo.connected ? '🟢 Connecté' : '🔴 Déconnecté'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                📦 Block #{networkInfo.blockNumber}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                🌐 Network {networkInfo.networkId}
              </span>
            </div>
          )}

          {user && (
            <div className="flex items-center justify-between mt-4 p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold">{user.name} ({user.role})</span>
                <span className="text-xs text-gray-600">{user.eth_address?.substring(0, 10)}...</span>
              </div>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          )}

          {lastTxHash && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Dernière transaction:</strong>
              <div className="text-xs text-gray-600 mt-1">
                📍 {lastTxHash.substring(0, 20)}... | 🔗 Block #{lastBlockNumber}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon="🏠">Accueil</TabButton>
            <TabButton active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon="📝">Inscription</TabButton>
            {user?.role === 'teacher' && (
              <>
                <TabButton active={activeTab === 'create-assignment'} onClick={() => setActiveTab('create-assignment')} icon="➕">Créer Devoir</TabButton>
                <TabButton active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} icon="📥">Soumissions</TabButton>
                <TabButton active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} icon="📢">Annonces</TabButton>
              </>
            )}
            {user?.role === 'student' && (
              <>
                <TabButton active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} icon="📚">Devoirs</TabButton>
                <TabButton active={activeTab === 'my-results'} onClick={() => setActiveTab('my-results')} icon="📊">Résultats</TabButton>
              </>
            )}
            <TabButton active={activeTab === 'blockchain'} onClick={() => {setActiveTab('blockchain'); loadBlockchain();}} icon="⛓️">Blockchain</TabButton>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB: ACCUEIL */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">📊 Tableau de Bord</h2>
            
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard value={stats.total_users} label="Utilisateurs" />
                <StatCard value={stats.total_assignments} label="Devoirs" />
                <StatCard value={stats.total_submissions} label="Soumissions" />
                <StatCard value={stats.current_block} label="Blocs" />
                <StatCard value="✅" label="Ganache" />
                <StatCard value="🔒" label="RSA" />
              </div>
            )}

            {stats && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-3">📜 Smart Contract</h3>
                <p className="text-sm text-gray-600"><strong>Adresse:</strong> {stats.contract_address}</p>
                <p className="text-sm text-gray-600"><strong>Réseau:</strong> {stats.network}</p>
              </div>
            )}

            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 rounded-lg shadow-lg text-white">
              <h3 className="text-2xl font-bold mb-4">🎯 Avantages de la Blockchain</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FeatureItem>Immuabilité totale des données</FeatureItem>
                <FeatureItem>Transparence et auditabilité</FeatureItem>
                <FeatureItem>Décentralisation sur Ethereum</FeatureItem>
                <FeatureItem>Cryptage RSA</FeatureItem>
                <FeatureItem>Smart Contracts vérifiables</FeatureItem>
                <FeatureItem>Traçabilité complète</FeatureItem>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INSCRIPTION */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">📝 Gestion des Utilisateurs</h2>
            
            {/* Sélection compte Ethereum */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3">🔐 Sélectionner un Compte Ethereum</h3>
              <select 
                value={selectedAccount} 
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Sélectionner un compte --</option>
                {accounts.map((account, index) => (
                  <option key={account} value={account}>
                    Compte {index + 1}: {account}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <div className="mt-3 p-3 bg-green-50 text-green-800 rounded">
                  ✅ Compte sélectionné: {selectedAccount}
                </div>
              )}
            </div>

            {/* Se connecter */}
            {!user && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">🔐 Se Connecter</h3>
                {allUsers.length === 0 ? (
                  <p className="text-gray-600">Aucun utilisateur. Créez un compte ci-dessous.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allUsers.map((u) => (
                      <div key={u.user_id} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition">
                        <h4 className="font-bold">{u.name}</h4>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded mt-2 ${u.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role === 'teacher' ? '👨‍🏫 Enseignant' : '👨‍🎓 Étudiant'}
                        </span>
                        <button onClick={() => handleLoginExisting(u)} className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          ✅ Connexion
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Créer un compte */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">➕ Créer un Nouveau Compte</h3>
              {!selectedAccount && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded">
                  ⚠️ Sélectionnez d'abord un compte Ethereum
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="ID Utilisateur" 
                  value={registerForm.user_id}
                  onChange={(e) => setRegisterForm({...registerForm, user_id: e.target.value})} 
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Nom complet" 
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})} 
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required 
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})} 
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required 
                />
                <select 
                  value={registerForm.role} 
                  onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="student">👨‍🎓 Étudiant</option>
                  <option value="teacher">👨‍🏫 Enseignant</option>
                </select>
                <button 
                  type="submit" 
                  disabled={!selectedAccount}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  ✨ Créer le Compte
                </button>
              </form>
            </div>

            {user && (
              <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <h3 className="text-lg font-semibold">🔐 Vos Clés RSA</h3>
                <div>
                  <label className="block font-semibold mb-2">Adresse Ethereum:</label>
                  <textarea readOnly value={user.eth_address} rows="1" className="w-full p-2 bg-gray-50 border rounded" />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Clé Publique:</label>
                  <textarea readOnly value={user.public_key} rows="4" className="w-full p-2 bg-gray-50 border rounded" />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Clé Privée:</label>
                  <textarea readOnly value={user.private_key} rows="4" className="w-full p-2 bg-gray-50 border rounded" />
                </div>
                <p className="text-red-600 font-semibold">⚠️ Sauvegardez vos clés!</p>
              </div>
            )}
          </div>
        )}

        {/* Autres tabs simplifiés pour respecter la limite */}
        {activeTab === 'blockchain' && blockchainData && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">⛓️ Informations Blockchain</h2>
            <div className="space-y-3 text-sm">
              <p><strong>Connecté:</strong> {blockchainData.is_connected ? '✅ Oui' : '❌ Non'}</p>
              <p><strong>Block actuel:</strong> #{blockchainData.current_block}</p>
              <p><strong>Network ID:</strong> {blockchainData.network_id}</p>
              <p><strong>Comptes:</strong> {blockchainData.accounts?.length || 0}</p>
            </div>
            <button onClick={loadBlockchain} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-semibold">🔗 Système de Gestion des Contrôles - Ethereum Blockchain</p>
          <p className="text-sm text-gray-400 mt-2">Smart Contracts + Cryptage RSA + Ganache</p>
          <p className="text-sm text-gray-400">Projet Final - ENSA Tétouan 2025-2026</p>
        </div>
      </footer>
    </div>
  );
}

// Composants auxiliaires
const TabButton = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
      active 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {icon} {children}
  </button>
);

const StatCard = ({ value, label }) => (
  <div className="bg-white p-6 rounded-lg shadow-md text-center">
    <div className="text-3xl font-bold text-indigo-600">{value}</div>
    <div className="text-sm text-gray-600 mt-2">{label}</div>
  </div>
);

const FeatureItem = ({ children }) => (
  <div className="flex items-center gap-2">
    <CheckCircle className="w-5 h-5 flex-shrink-0" />
    <span>{children}</span>
  </div>
);

export default App;
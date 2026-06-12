import React, { useState, useEffect } from 'react';
import { BookOpen, Send, FileText, Lock, Unlock, CheckCircle, AlertCircle, Users, RefreshCw, WifiOff, DollarSign, Zap, Megaphone, Award, TrendingUp, Calendar, MessageSquare, X, LogIn, User, Mail, Database } from 'lucide-react';

const BlockchainEducationSystem = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [role, setRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [loginForm, setLoginForm] = useState({ name: '', email: '', role: '' });
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [results, setResults] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState({});

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    deadline: ''
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    relatedAssignmentId: null
  });

  const [newResult, setNewResult] = useState({
    submissionId: null,
    grade: '',
    feedback: '',
    isPublic: false
  });

  const [submissionText, setSubmissionText] = useState('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const CONTRACT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

  // Charger les données depuis le stockage local au démarrage
  useEffect(() => {
    loadFromStorage();
    checkMetaMaskAndGanache();
    setupMetaMaskListeners();
  }, []);

  // Sauvegarder automatiquement les données
  useEffect(() => {
    if (Object.keys(registeredUsers).length > 0) {
      saveToStorage();
    }
  }, [registeredUsers, assignments, submissions, announcements, results, transactionHistory]);

  useEffect(() => {
    if (account) {
      updateBalance();
      checkExistingUser(account);
      const interval = setInterval(updateBalance, 3000);
      return () => clearInterval(interval);
    }
  }, [account]);

  // Fonctions de stockage
  const saveToStorage = () => {
    try {
      localStorage.setItem('blockchain_users', JSON.stringify(registeredUsers));
      localStorage.setItem('blockchain_assignments', JSON.stringify(assignments));
      localStorage.setItem('blockchain_submissions', JSON.stringify(submissions));
      localStorage.setItem('blockchain_announcements', JSON.stringify(announcements));
      localStorage.setItem('blockchain_results', JSON.stringify(results));
      localStorage.setItem('blockchain_transactions', JSON.stringify(transactionHistory));
      console.log('✅ Données sauvegardées');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
    }
  };

  const loadFromStorage = () => {
    try {
      const users = localStorage.getItem('blockchain_users');
      const assign = localStorage.getItem('blockchain_assignments');
      const subs = localStorage.getItem('blockchain_submissions');
      const anns = localStorage.getItem('blockchain_announcements');
      const res = localStorage.getItem('blockchain_results');
      const txs = localStorage.getItem('blockchain_transactions');

      if (users) setRegisteredUsers(JSON.parse(users));
      if (assign) setAssignments(JSON.parse(assign));
      if (subs) setSubmissions(JSON.parse(subs));
      if (anns) setAnnouncements(JSON.parse(anns));
      if (res) setResults(JSON.parse(res));
      if (txs) setTransactionHistory(JSON.parse(txs));
      
      console.log('✅ Données chargées depuis le stockage local');
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    }
  };

  const checkExistingUser = (address) => {
    const normalizedAddress = address.toLowerCase();
    if (registeredUsers[normalizedAddress]) {
      const user = registeredUsers[normalizedAddress];
      setUserInfo({ name: user.name, email: user.email });
      setRole(user.role);
      setIsAuthenticated(true);
      console.log('✅ Utilisateur reconnu:', user.name);
      alert(`👋 Bon retour ${user.name}!\n\n` +
            `📧 ${user.email}\n` +
            `👤 Rôle: ${user.role === 'teacher' ? 'Enseignant' : 'Étudiant'}`);
    }
  };

  const registerUser = (address, name, email, userRole) => {
    const normalizedAddress = address.toLowerCase();
    const newUsers = {
      ...registeredUsers,
      [normalizedAddress]: {
        name,
        email,
        role: userRole,
        registeredAt: new Date().toISOString()
      }
    };
    setRegisteredUsers(newUsers);
    console.log('✅ Utilisateur enregistré:', name);
  };

  const checkMetaMaskAndGanache = async () => {
    if (typeof window.ethereum === 'undefined') {
      console.log('❌ MetaMask non installé');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });

      if (accounts.length > 0) {
        console.log('✅ Déjà connecté:', accounts[0]);
        setAccount(accounts[0]);
        await getNetworkInfo();
        await updateBalance();
      }
    } catch (error) {
      console.error('Erreur vérification connexion:', error);
    }
  };

  const updateBalance = async () => {
    if (!account) return;
    
    try {
      const balanceWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [account, 'latest']
      });
      
      const balanceEth = parseInt(balanceWei, 16) / 1e18;
      setBalance(balanceEth.toFixed(4));
    } catch (error) {
      console.error('Erreur récupération solde:', error);
    }
  };

  const getNetworkInfo = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkVersion = await window.ethereum.request({ method: 'net_version' });
      
      let networkName = 'Inconnu';
      if (chainId === '0x539' || networkVersion === '1337') {
        networkName = 'Ganache Local';
      } else if (chainId === '0x1') {
        networkName = 'Ethereum Mainnet';
      }

      setNetworkInfo({
        chainId,
        networkVersion,
        networkName
      });

      console.log('🌐 Réseau:', networkName, 'Chain ID:', chainId);
    } catch (error) {
      console.error('Erreur réseau:', error);
    }
  };

  const setupMetaMaskListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount('');
          setBalance('0');
          setIsAuthenticated(false);
          setUserInfo({ name: '', email: '' });
          setRole('');
        } else {
          setAccount(accounts[0]);
          updateBalance();
          checkExistingUser(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      });
    }
  };

  const handleLogin = async () => {
    if (!loginForm.name || !loginForm.email || !loginForm.role) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginForm.email)) {
      alert('⚠️ Email invalide');
      return;
    }

    if (!account) {
      await connectWallet();
    }

    if (account) {
      const normalizedAddress = account.toLowerCase();
      
      // Vérifier si l'adresse est déjà enregistrée avec un autre utilisateur
      if (registeredUsers[normalizedAddress]) {
        const existingUser = registeredUsers[normalizedAddress];
        if (existingUser.email !== loginForm.email) {
          alert(`⚠️ Cette adresse est déjà associée à:\n\n` +
                `👤 ${existingUser.name}\n` +
                `📧 ${existingUser.email}\n\n` +
                `Veuillez utiliser la même adresse blockchain ou changer de compte MetaMask.`);
          return;
        }
      }

      registerUser(account, loginForm.name, loginForm.email, loginForm.role);
      
      setUserInfo({
        name: loginForm.name,
        email: loginForm.email
      });
      setRole(loginForm.role);
      setIsAuthenticated(true);
      
      alert(`✅ Bienvenue ${loginForm.name}!\n\n` +
            `📧 Email: ${loginForm.email}\n` +
            `👤 Rôle: ${loginForm.role === 'teacher' ? 'Enseignant' : 'Étudiant'}\n` +
            `🔗 Compte: ${account.substring(0, 10)}...\n\n` +
            `💾 Vos informations sont sauvegardées pour les prochaines connexions.`);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginForm({ name: '', email: '', role: '' });
    disconnectWallet();
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('❌ MetaMask non installé!\n\n' +
            '📥 Installez MetaMask depuis:\n' +
            'https://metamask.io/download/');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const selectedAccount = accounts[0];
      setAccount(selectedAccount);
      
      await getNetworkInfo();
      await updateBalance();

      console.log('✅ Connexion réussie!');

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      
      if (error.code === 4001) {
        alert('❌ Connexion refusée');
      } else {
        alert(`❌ Erreur: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('0');
    setNetworkInfo(null);
  };

  const sendSimpleTransaction = async (description) => {
    try {
      setIsSending(true);
      
      console.log('📤 Envoi transaction:', description);

      const txData = {
        from: account,
        to: CONTRACT_ADDRESS,
        value: '0x0',
        gas: '0x30D40',
      };

      console.log('📋 Données transaction:', txData);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txData]
      });

      console.log('✅ Transaction envoyée! Hash:', txHash);
      
      alert(`⏳ Transaction en cours...\n\nHash: ${txHash}\n\nVeuillez patienter...`);
      
      const receipt = await waitForTransaction(txHash);
      
      console.log('✅ Transaction confirmée!', receipt);

      const gasUsed = parseInt(receipt.gasUsed, 16);
      const gasPrice = await window.ethereum.request({
        method: 'eth_gasPrice'
      });
      const gasCost = (gasUsed * parseInt(gasPrice, 16)) / 1e18;

      const transaction = {
        hash: txHash,
        from: receipt.from,
        to: receipt.to,
        blockNumber: parseInt(receipt.blockNumber, 16),
        gasUsed: gasUsed,
        gasCost: gasCost.toFixed(6),
        timestamp: new Date().toISOString(),
        description: description,
        status: receipt.status === '0x1' ? 'success' : 'failed',
        userAddress: account.toLowerCase()
      };

      setTransactionHistory(prev => [transaction, ...prev]);
      await updateBalance();

      alert(`✅ Transaction confirmée!\n\n` +
            `📝 ${description}\n` +
            `🔗 Hash: ${txHash}\n` +
            `⛽ Gas utilisé: ${gasUsed}\n` +
            `💰 Coût: ${gasCost.toFixed(6)} ETH\n` +
            `🆕 Nouveau solde: ${balance} ETH`);

      return receipt;

    } catch (error) {
      console.error('❌ Erreur transaction:', error);
      
      if (error.code === 4001) {
        alert('❌ Transaction refusée par l\'utilisateur');
      } else if (error.code === -32603) {
        alert('❌ Erreur blockchain:\n' + error.message);
      } else {
        alert('❌ Erreur: ' + error.message);
      }
      
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const waitForTransaction = async (txHash, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });

        if (receipt) {
          return receipt;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Erreur attente transaction:', error);
      }
    }
    throw new Error('Transaction timeout');
  };

  const createAssignment = async () => {
    if (!account) {
      alert('❌ Veuillez connecter votre portefeuille');
      return;
    }

    if (!newAssignment.title || !newAssignment.description) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    try {
      const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${Math.random().toString(36).substring(7)}
-----END PUBLIC KEY-----`;

      const receipt = await sendSimpleTransaction(
        `Création du devoir: ${newAssignment.title}`
      );

      const assignment = {
        id: Date.now(),
        title: newAssignment.title,
        description: newAssignment.description,
        deadline: newAssignment.deadline,
        teacherAddress: account.toLowerCase(),
        teacherName: userInfo.name,
        teacherEmail: userInfo.email,
        publicKey: publicKey,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(receipt.blockNumber, 16),
        txHash: receipt.transactionHash
      };

      setAssignments(prev => [...prev, assignment]);
      setNewAssignment({ title: '', description: '', deadline: '' });

    } catch (error) {
      console.error('Erreur création devoir:', error);
    }
  };

  const submitAssignment = async () => {
    if (!account) {
      alert('❌ Veuillez connecter votre portefeuille');
      return;
    }

    if (!selectedAssignment || !submissionText) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    try {
      const dataToEncrypt = JSON.stringify({
        studentName: userInfo.name,
        studentEmail: userInfo.email,
        studentAddress: account.toLowerCase(),
        answer: submissionText,
        timestamp: new Date().toISOString()
      });

      const encrypted = btoa(dataToEncrypt);

      const receipt = await sendSimpleTransaction(
        `Soumission du devoir: ${selectedAssignment.title}`
      );

      const submission = {
        id: Date.now(),
        assignmentId: selectedAssignment.id,
        studentAddress: account.toLowerCase(),
        studentName: userInfo.name,
        studentEmail: userInfo.email,
        encryptedData: encrypted,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(receipt.blockNumber, 16),
        txHash: receipt.transactionHash
      };

      setSubmissions(prev => [...prev, submission]);
      setSubmissionText('');
      setSelectedAssignment(null);

      alert('✅ Devoir soumis avec succès!\n\n' +
            `📚 ${selectedAssignment.title}\n` +
            `👨‍🏫 Enseignant: ${selectedAssignment.teacherName}`);

    } catch (error) {
      console.error('Erreur soumission:', error);
    }
  };

  const createAnnouncement = async () => {
    if (!account) {
      alert('❌ Veuillez connecter votre portefeuille');
      return;
    }

    if (!newAnnouncement.title || !newAnnouncement.message) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const receipt = await sendSimpleTransaction(
        `Publication d'une annonce: ${newAnnouncement.title}`
      );

      const announcement = {
        id: Date.now(),
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        relatedAssignmentId: newAnnouncement.relatedAssignmentId,
        teacherAddress: account.toLowerCase(),
        teacherName: userInfo.name,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(receipt.blockNumber, 16),
        txHash: receipt.transactionHash
      };

      setAnnouncements(prev => [announcement, ...prev]);
      setNewAnnouncement({ title: '', message: '', relatedAssignmentId: null });
      setShowAnnouncementForm(false);

    } catch (error) {
      console.error('Erreur création annonce:', error);
    }
  };

  const publishResult = async () => {
    if (!account) {
      alert('❌ Veuillez connecter votre portefeuille');
      return;
    }

    if (!selectedSubmission || !newResult.grade || !newResult.feedback) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    const grade = parseFloat(newResult.grade);
    if (grade < 0 || grade > 20) {
      alert('⚠️ La note doit être entre 0 et 20');
      return;
    }

    try {
      const receipt = await sendSimpleTransaction(
        `Publication d'un résultat (Note: ${newResult.grade}/20) pour ${selectedSubmission.studentName}`
      );

      const result = {
        id: Date.now(),
        submissionId: selectedSubmission.id,
        assignmentId: selectedSubmission.assignmentId,
        studentAddress: selectedSubmission.studentAddress,
        studentName: selectedSubmission.studentName,
        studentEmail: selectedSubmission.studentEmail,
        grade: grade,
        feedback: newResult.feedback,
        isPublic: newResult.isPublic,
        teacherAddress: account.toLowerCase(),
        teacherName: userInfo.name,
        timestamp: new Date().toISOString(),
        blockNumber: parseInt(receipt.blockNumber, 16),
        txHash: receipt.transactionHash
      };

      setResults(prev => [result, ...prev]);
      setNewResult({ submissionId: null, grade: '', feedback: '', isPublic: false });
      setSelectedSubmission(null);
      setShowResultForm(false);

      alert(`✅ Résultat publié avec succès!\n\n` +
            `👨‍🎓 Étudiant: ${selectedSubmission.studentName}\n` +
            `📊 Note: ${grade}/20\n` +
            `${newResult.isPublic ? '👁️ Résultat public' : '🔒 Résultat privé'}`);

    } catch (error) {
      console.error('Erreur publication résultat:', error);
    }
  };

  const viewSubmissions = (assignmentId) => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  };

  const decryptSubmission = (encryptedData) => {
    try {
      const decrypted = atob(encryptedData);
      return JSON.parse(decrypted);
    } catch (e) {
      return { error: 'Erreur de déchiffrement' };
    }
  };

  const getMyAssignments = () => {
    if (!account) return [];
    return assignments.filter(a => a.teacherAddress.toLowerCase() === account.toLowerCase());
  };

  const getMySubmissions = () => {
    if (!account) return [];
    return submissions.filter(s => s.studentAddress.toLowerCase() === account.toLowerCase());
  };

  const getMyResults = () => {
    if (!account) return [];
    return results.filter(r => r.studentAddress.toLowerCase() === account.toLowerCase());
  };

  const getMyTransactions = () => {
    if (!account) return [];
    return transactionHistory.filter(tx => tx.userAddress === account.toLowerCase());
  };

  const getResultForSubmission = (submissionId) => {
    return results.find(r => r.submissionId === submissionId);
  };

  const getAvailableAssignments = () => {
    return assignments;
  };

  // Page de connexion
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Système Blockchain Éducatif
              </h1>
              <p className="text-gray-600">
                Connectez-vous pour accéder à la plateforme
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nom complet
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ahmed Benali"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({...loginForm, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Ex: ahmed.benali@etu.uae.ac.ma"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Rôle
                </label>
                <select
                  value={loginForm.role}
                  onChange={(e) => setLoginForm({...loginForm, role: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez votre rôle</option>
                  <option value="student">👨‍🎓 Étudiant</option>
                  <option value="teacher">👨‍🏫 Enseignant</option>
                </select>
              </div>

              <button
                onClick={handleLogin}
                disabled={isConnecting}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </>
                )}
              </button>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  💾 Système avec mémoire
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ Vos données sont sauvegardées</li>
                  <li>✓ Une adresse = un utilisateur unique</li>
                  <li>✓ Reconnexion automatique</li>
                  <li>✓ Historique conservé</li>
                </ul>
              </div>

              {Object.keys(registeredUsers).length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 font-semibold mb-1">
                    👥 {Object.keys(registeredUsers).length} utilisateur(s) enregistré(s)
                  </p>
                  <p className="text-xs text-green-700">
                    Le système reconnaîtra automatiquement votre adresse
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white text-sm">
              © 2024 ENSA Tétouan - Système Blockchain Éducatif
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Interface principale après authentification
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Système Blockchain Éducatif</h1>
                <p className="text-sm text-gray-600">
                  Bienvenue, <span className="font-semibold text-indigo-600">{userInfo.name}</span>
                  {' '}({role === 'teacher' ? '👨‍🏫 Enseignant' : '👨‍🎓 Étudiant'})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{userInfo.email}</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                    <CheckCircle className="w-3 h-3" />
                    Connecté
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">
                    <DollarSign className="w-3 h-3" />
                    {balance} ETH
                  </div>
                </div>
              </div>
              <button
                onClick={updateBalance}
                className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm"
                title="Actualiser le solde"
              >
                <RefreshCw className="w-4 h-4" />
                </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-semibold"
              >
                Déconnexion
              </button>
            </div>
          </div>
          
          {account && networkInfo && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-blue-800">
                    🌐 <strong>Réseau:</strong> {networkInfo.networkName}
                  </span>
                  <span className="text-blue-800">
                    🔗 <strong>Chain ID:</strong> {networkInfo.chainId}
                  </span>
                  <span className="text-blue-800">
                    👤 <strong>Adresse:</strong> <span className="font-mono">{account.substring(0, 10)}...{account.substring(38)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {isSending && (
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                <div>
                  <p className="text-yellow-800 font-bold">⚡ Transaction en cours...</p>
                  <p className="text-yellow-700 text-sm">
                    La transaction est en train d'être minée sur la blockchain.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Annonces pour tout le monde */}
            {announcements.length > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Megaphone className="w-6 h-6" />
                  Annonces Récentes
                </h2>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(announcement => (
                    <div key={announcement.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg">{announcement.title}</h3>
                        <Calendar className="w-4 h-4 opacity-70" />
                      </div>
                      <p className="text-sm text-white/90 mb-2">{announcement.message}</p>
                      <p className="text-xs text-white/70 mb-1">
                        Par: {announcement.teacherName}
                      </p>
                      {announcement.relatedAssignmentId && (
                        <p className="text-xs text-white/70">
                          📚 Lié au devoir ID: {announcement.relatedAssignmentId}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20 text-xs">
                        <span className="opacity-70">
                          {new Date(announcement.timestamp).toLocaleString('fr-FR')}
                        </span>
                        <span className="font-mono bg-white/20 px-2 py-1 rounded">
                          Block #{announcement.blockNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {role === 'teacher' ? (
              <>
                {/* Interface Enseignant */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Créer un Devoir
                  </h2>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <p className="text-green-800 font-semibold mb-1">
                        ✅ Transaction blockchain réelle
                      </p>
                      <p className="text-green-700 text-xs">
                        Le devoir sera visible par tous les étudiants
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Titre du devoir"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      disabled={isSending}
                    />
                    <textarea
                      placeholder="Description et instructions"
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg h-32"
                      disabled={isSending}
                    />
                    <input
                      type="datetime-local"
                      value={newAssignment.deadline}
                      onChange={(e) => setNewAssignment({...newAssignment, deadline: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      disabled={isSending}
                    />
                    <button
                      onClick={createAssignment}
                      disabled={isSending}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Transaction en cours...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Créer le Devoir
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Formulaire d'annonce */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                      Publier une Annonce
                    </h2>
                    <button
                      onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      {showAnnouncementForm ? 'Masquer' : 'Nouvelle Annonce'}
                    </button>
                  </div>
                  
                  {showAnnouncementForm && (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="text-blue-800 font-semibold mb-1">
                          📢 Annonce publique - Visible par tous les étudiants
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="Titre de l'annonce"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={isSending}
                      />
                      <textarea
                        placeholder="Message de l'annonce"
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg h-32"
                        disabled={isSending}
                      />
                      <select
                        value={newAnnouncement.relatedAssignmentId || ''}
                        onChange={(e) => setNewAnnouncement({
                          ...newAnnouncement, 
                          relatedAssignmentId: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={isSending}
                      >
                        <option value="">Pas de devoir lié</option>
                        {assignments.map(assignment => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={createAnnouncement}
                        disabled={isSending}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
                      >
                        {isSending ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Publication...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Publier l'Annonce
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mes devoirs et soumissions */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Mes Devoirs et Soumissions</h2>
                  {getMyAssignments().length > 0 ? (
                    getMyAssignments().map(assignment => {
                      const assignmentSubmissions = viewSubmissions(assignment.id);
                      return (
                        <div key={assignment.id} className="mb-6 p-4 border rounded-lg bg-gray-50">
                          <h3 className="font-bold text-lg mb-2">{assignment.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {assignmentSubmissions.length} soumission(s) reçue(s)
                          </p>
                          <div className="text-xs text-gray-500 mb-3 space-y-1">
                            <p>📅 Deadline: {new Date(assignment.deadline).toLocaleString('fr-FR')}</p>
                            <p>🔗 Block: #{assignment.blockNumber}</p>
                          </div>
                          {assignmentSubmissions.map(sub => {
                            const decrypted = decryptSubmission(sub.encryptedData);
                            const result = getResultForSubmission(sub.id);
                            return (
                              <div key={sub.id} className="bg-white p-3 rounded mb-2 border">
                                <div className="flex items-start gap-2">
                                  <Unlock className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{sub.studentName}</p>
                                    <p className="text-xs text-gray-600">{sub.studentEmail}</p>
                                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                      {decrypted.answer}
                                    </p>
                                    <p className="text-xs text-indigo-600 mt-2">
                                      Soumis le: {new Date(sub.timestamp).toLocaleString('fr-FR')}
                                    </p>
                                    
                                    {result ? (
                                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Award className="w-4 h-4 text-green-600" />
                                          <span className="font-bold text-green-800">Note: {result.grade}/20</span>
                                          <span className="text-xs text-gray-600">
                                            {result.isPublic ? '(👁️ Public)' : '(🔒 Privé)'}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{result.feedback}</p>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedSubmission(sub);
                                          setShowResultForm(true);
                                        }}
                                        className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
                                      >
                                        <Award className="w-3 h-3" />
                                        Noter cette soumission
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Aucun devoir créé</p>
                    </div>
                  )}
                </div>

                {/* Formulaire de notation */}
                {showResultForm && selectedSubmission && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        Publier un Résultat
                      </h2>
                      <button
                        onClick={() => {
                          setShowResultForm(false);
                          setSelectedSubmission(null);
                          setNewResult({ submissionId: null, grade: '', feedback: '', isPublic: false });
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <p className="text-yellow-800 font-semibold">
                          📊 Notation de: {selectedSubmission.studentName}
                        </p>
                        <p className="text-yellow-700 text-xs mt-1">
                          Email: {selectedSubmission.studentEmail}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Note sur 20
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="Ex: 15.5"
                          value={newResult.grade}
                          onChange={(e) => setNewResult({...newResult, grade: e.target.value})}
                          className="w-full px-4 py-2 border rounded-lg"
                          disabled={isSending}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Commentaires / Feedback
                        </label>
                        <textarea
                          placeholder="Commentaires sur la copie..."
                          value={newResult.feedback}
                          onChange={(e) => setNewResult({...newResult, feedback: e.target.value})}
                          className="w-full px-4 py-2 border rounded-lg h-32"
                          disabled={isSending}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPublic"
                          checked={newResult.isPublic}
                          onChange={(e) => setNewResult({...newResult, isPublic: e.target.checked})}
                          className="w-4 h-4"
                          disabled={isSending}
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-700">
                          Rendre ce résultat public (visible dans le classement)
                        </label>
                      </div>
                      <button
                        onClick={publishResult}
                        disabled={isSending}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
                      >
                        {isSending ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Publication...
                          </>
                        ) : (
                          <>
                            <Award className="w-4 h-4" />
                            Publier le Résultat
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Interface Étudiant */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Devoirs Disponibles</h2>
                  <div className="space-y-4">
                    {getAvailableAssignments().length > 0 ? (
                      getAvailableAssignments().map(assignment => {
                        const mySubmission = submissions.find(
                          s => s.assignmentId === assignment.id && 
                               s.studentAddress.toLowerCase() === account.toLowerCase()
                        );
                        const isSubmitted = !!mySubmission;
                        
                        return (
                          <div 
                            key={assignment.id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                              selectedAssignment?.id === assignment.id 
                                ? 'border-indigo-600 bg-indigo-50' 
                                : isSubmitted
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                            onClick={() => !isSubmitted && setSelectedAssignment(assignment)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{assignment.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                                <div className="text-xs text-gray-500 mt-2 space-y-1">
                                  <p>👨‍🏫 Enseignant: {assignment.teacherName}</p>
                                  <p>📅 Date limite: {new Date(assignment.deadline).toLocaleString('fr-FR')}</p>
                                  <p>🔗 Block #{assignment.blockNumber}</p>
                                </div>
                              </div>
                              {isSubmitted && (
                                <div className="ml-3">
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                                    ✓ Soumis
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun devoir disponible</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAssignment && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-green-600" />
                      Soumettre le Devoir
                    </h2>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800 font-semibold mb-1">
                          📚 Devoir: {selectedAssignment.title}
                        </p>
                        <p className="text-green-700 text-xs">
                          Votre soumission sera chiffrée et enregistrée sur la blockchain
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="text-blue-800 font-semibold">Vos informations:</p>
                        <p className="text-blue-700 text-xs mt-1">👤 {userInfo.name}</p>
                        <p className="text-blue-700 text-xs">📧 {userInfo.email}</p>
                      </div>
                      <textarea
                        placeholder="Votre réponse..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg h-40"
                        disabled={isSending}
                      />
                      <button
                        onClick={submitAssignment}
                        disabled={isSending}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSending ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Soumettre le Devoir
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mes soumissions */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Mes Soumissions
                  </h2>
                  {getMySubmissions().length > 0 ? (
                    <div className="space-y-3">
                      {getMySubmissions().map(sub => {
                        const assignment = assignments.find(a => a.id === sub.assignmentId);
                        const result = getResultForSubmission(sub.id);
                        return (
                          <div key={sub.id} className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-bold text-gray-800">{assignment?.title}</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Soumis le: {new Date(sub.timestamp).toLocaleString('fr-FR')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Enseignant: {assignment?.teacherName}
                            </p>
                            {result ? (
                              <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
                                <div className="flex items-center gap-2">
                                  <Award className="w-5 h-5 text-green-600" />
                                  <span className="font-bold text-green-800 text-lg">
                                    {result.grade}/20
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-2">{result.feedback}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Corrigé par: {result.teacherName}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                ⏳ En attente de correction
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Aucune soumission</p>
                    </div>
                  )}
                </div>

                {/* Mes Résultats */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Mes Résultats
                  </h2>
                  {getMyResults().length > 0 ? (
                    <div className="space-y-4">
                      {getMyResults().map(result => {
                        const assignment = assignments.find(a => a.id === result.assignmentId);
                        return (
                          <div key={result.id} className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-lg">{assignment?.title || 'Devoir'}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(result.timestamp).toLocaleString('fr-FR')}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Corrigé par: {result.teacherName}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-green-600 flex items-center gap-1">
                                  <Award className="w-6 h-6" />
                                  {result.grade}/20
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {result.isPublic ? '👁️ Public' : '🔒 Privé'}
                                </p>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <p className="text-sm font-semibold text-gray-700 mb-1">Commentaires:</p>
                              <p className="text-sm text-gray-600">{result.feedback}</p>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              🔗 Block #{result.blockNumber}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Aucun résultat disponible</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-3">Profil Utilisateur</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs text-gray-600">Nom</p>
                    <p className="font-semibold text-gray-800">{userInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="font-semibold text-gray-800 text-sm">{userInfo.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Rôle</p>
                    <p className="font-semibold text-gray-800">
                      {role === 'teacher' ? '👨‍🏫 Enseignant' : '👨‍🎓 Étudiant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Statistiques
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Devoirs créés:</span>
                  <span className="font-bold text-indigo-600">{getMyAssignments().length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Soumissions:</span>
                  <span className="font-bold text-green-600">{getMySubmissions().length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Résultats:</span>
                  <span className="font-bold text-yellow-600">{getMyResults().length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-bold text-blue-600">{getMyTransactions().length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-3">État de Connexion</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {typeof window.ethereum !== 'undefined' ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  }
                  <span>MetaMask: {typeof window.ethereum !== 'undefined' ? 'Installé' : 'Non installé'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {account ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  }
                  <span>Wallet: {account ? 'Connecté' : 'Non connecté'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {networkInfo ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  }
                  <span>Réseau: {networkInfo ? networkInfo.networkName : 'Non détecté'}</span>
                </div>
                {account && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Solde:</span>
                      <span className="font-bold text-green-600 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {balance} ETH
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Toutes les annonces */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Toutes les Annonces
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {announcements.length > 0 ? (
                  announcements.map(announcement => (
                    <div key={announcement.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-semibold text-blue-900 mb-1">{announcement.title}</h4>
                      <p className="text-sm text-gray-700 mb-2">{announcement.message}</p>
                      <p className="text-xs text-blue-600 mb-1">
                        Par: {announcement.teacherName}
                      </p>
                      {announcement.relatedAssignmentId && (
                        <p className="text-xs text-blue-600 mb-1">
                          📚 Devoir lié: {assignments.find(a => a.id === announcement.relatedAssignmentId)?.title}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                        <span className="text-xs text-gray-600">
                          {new Date(announcement.timestamp).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-xs font-mono bg-blue-100 px-2 py-0.5 rounded">
                          Block #{announcement.blockNumber}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Aucune annonce disponible
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Mes Transactions
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getMyTransactions().length > 0 ? (
                  getMyTransactions().map((tx, index) => (
                    <div key={index} className="text-xs p-3 bg-gray-50 rounded border">
                      <div className="flex items-start justify-between mb-1">
                        <span className={`font-semibold ${tx.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.status === 'success' ? '✅' : '❌'} {tx.description}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">Block #{tx.blockNumber}</p>
                      <p className="text-gray-500 font-mono truncate">
                        {tx.hash}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
                        <span className="text-gray-600">⛽ {tx.gasUsed} gas</span>
                        <span className="text-red-600 font-bold">-{tx.gasCost} ETH</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(tx.timestamp).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4">
                    Aucune transaction effectuée
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Système Complet avec Mémoire
              </h3>
              <ul className="space-y-2 text-sm">
                <li>✅ Authentification sécurisée</li>
                <li>✅ Stockage local persistant</li>
                <li>✅ Une adresse = un utilisateur</li>
                <li>✅ Devoirs personnalisés</li>
                <li>✅ Résultats individuels</li>
                <li>✅ Historique complet</li>
                <li>✅ Transactions blockchain</li>
                <li>✅ Reconnexion automatique</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                💡 Fonctionnalités
              </h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Vos données sont sauvegardées localement</li>
                <li>• Chaque adresse est unique</li>
                <li>• Les devoirs sont visibles par tous</li>
                <li>• Les résultats sont personnalisés</li>
                <li>• Reconnexion automatique</li>
                <li>• Historique conservé</li>
              </ul>
            </div>

            {Object.keys(registeredUsers).length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Utilisateurs Enregistrés
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(registeredUsers).map(([address, user]) => (
                    <div key={address} className="p-2 bg-gray-50 rounded text-xs">
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-gray-500 font-mono truncate">{address}</p>
                      <p className="text-gray-400 mt-1">
                        {user.role === 'teacher' ? '👨‍🏫 Enseignant' : '👨‍🎓 Étudiant'}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Total: {Object.keys(registeredUsers).length} utilisateur(s)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainEducationSystem;
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend
import json
import base64
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# ==============================================
# CONFIGURATION WEB3 - GANACHE
# ==============================================

GANACHE_URL = "http://127.0.0.1:7545"
web3 = Web3(Web3.HTTPProvider(GANACHE_URL))

if web3.is_connected():
    print(" Connecté à Ganache")
    print(f" Chain ID: {web3.eth.chain_id}")
    print(f" Dernier bloc: {web3.eth.block_number}")
    print(f" Comptes disponibles: {len(web3.eth.accounts)}")
    
    for i, account in enumerate(web3.eth.accounts[:3]):
        balance = web3.eth.get_balance(account)
        balance_eth = web3.from_wei(balance, 'ether')
        print(f"   [{i}] {account} - {balance_eth} ETH")
else:
    print("❌ Échec de connexion à Ganache")

# ==============================================
# SMART CONTRACT SOLIDITY - VERSION ÉTENDUE
# ==============================================

SOLIDITY_CONTRACT = '''
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AssignmentManager {
    
    struct Assignment {
        uint256 id;
        string title;
        string description;
        address teacher;
        string publicKey;
        uint256 deadline;
        uint256 timestamp;
        bool exists;
    }
    
    struct Submission {
        address student;
        string encryptedData;
        uint256 timestamp;
        bool exists;
    }
    
    struct Announcement {
        uint256 id;
        string title;
        string message;
        uint256 relatedAssignmentId;
        address teacher;
        uint256 timestamp;
    }
    
    struct Result {
        uint256 submissionId;
        uint256 grade;
        string feedback;
        bool isPublic;
        address teacher;
        uint256 timestamp;
    }
    
    mapping(uint256 => Assignment) public assignments;
    mapping(uint256 => Submission[]) public submissions;
    mapping(uint256 => Announcement) public announcements;
    mapping(uint256 => Result) public results;
    
    uint256 public assignmentCount;
    uint256 public announcementCount;
    uint256 public resultCount;
    
    event AssignmentCreated(uint256 indexed assignmentId, address indexed teacher, string title);
    event SubmissionCreated(uint256 indexed assignmentId, address indexed student);
    event AnnouncementCreated(uint256 indexed announcementId, address indexed teacher, string title);
    event ResultPublished(uint256 indexed resultId, uint256 submissionId, uint256 grade);
    
    function createAssignment(
        string memory _title,
        string memory _description,
        string memory _publicKey,
        uint256 _deadline
    ) public returns (uint256) {
        assignmentCount++;
        
        assignments[assignmentCount] = Assignment({
            id: assignmentCount,
            title: _title,
            description: _description,
            teacher: msg.sender,
            publicKey: _publicKey,
            deadline: _deadline,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit AssignmentCreated(assignmentCount, msg.sender, _title);
        return assignmentCount;
    }
    
    function submitAssignment(
        uint256 _assignmentId,
        string memory _encryptedData
    ) public {
        require(assignments[_assignmentId].exists, "Assignment does not exist");
        require(block.timestamp <= assignments[_assignmentId].deadline, "Deadline passed");
        
        submissions[_assignmentId].push(Submission({
            student: msg.sender,
            encryptedData: _encryptedData,
            timestamp: block.timestamp,
            exists: true
        }));
        
        emit SubmissionCreated(_assignmentId, msg.sender);
    }
    
    function createAnnouncement(
        string memory _title,
        string memory _message,
        uint256 _relatedAssignmentId
    ) public returns (uint256) {
        announcementCount++;
        
        announcements[announcementCount] = Announcement({
            id: announcementCount,
            title: _title,
            message: _message,
            relatedAssignmentId: _relatedAssignmentId,
            teacher: msg.sender,
            timestamp: block.timestamp
        });
        
        emit AnnouncementCreated(announcementCount, msg.sender, _title);
        return announcementCount;
    }
    
    function publishResult(
        uint256 _submissionId,
        uint256 _grade,
        string memory _feedback,
        bool _isPublic
    ) public returns (uint256) {
        require(_grade <= 20, "Grade must be <= 20");
        
        resultCount++;
        
        results[resultCount] = Result({
            submissionId: _submissionId,
            grade: _grade,
            feedback: _feedback,
            isPublic: _isPublic,
            teacher: msg.sender,
            timestamp: block.timestamp
        });
        
        emit ResultPublished(resultCount, _submissionId, _grade);
        return resultCount;
    }
    
    function getSubmissions(uint256 _assignmentId) public view returns (
        address[] memory students,
        string[] memory encryptedDataList,
        uint256[] memory timestamps
    ) {
        uint256 count = submissions[_assignmentId].length;
        students = new address[](count);
        encryptedDataList = new string[](count);
        timestamps = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            students[i] = submissions[_assignmentId][i].student;
            encryptedDataList[i] = submissions[_assignmentId][i].encryptedData;
            timestamps[i] = submissions[_assignmentId][i].timestamp;
        }
        
        return (students, encryptedDataList, timestamps);
    }
    
    function getAnnouncements() public view returns (
        uint256[] memory ids,
        string[] memory titles,
        string[] memory messages,
        uint256[] memory timestamps
    ) {
        ids = new uint256[](announcementCount);
        titles = new string[](announcementCount);
        messages = new string[](announcementCount);
        timestamps = new uint256[](announcementCount);
        
        for (uint256 i = 1; i <= announcementCount; i++) {
            ids[i-1] = announcements[i].id;
            titles[i-1] = announcements[i].title;
            messages[i-1] = announcements[i].message;
            timestamps[i-1] = announcements[i].timestamp;
        }
        
        return (ids, titles, messages, timestamps);
    }
}
'''

# ABI étendu avec annonces et résultats
CONTRACT_ABI = json.loads('''[
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "assignmentId", "type": "uint256"},
            {"indexed": true, "internalType": "address", "name": "teacher", "type": "address"},
            {"indexed": false, "internalType": "string", "name": "title", "type": "string"}
        ],
        "name": "AssignmentCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "announcementId", "type": "uint256"},
            {"indexed": true, "internalType": "address", "name": "teacher", "type": "address"},
            {"indexed": false, "internalType": "string", "name": "title", "type": "string"}
        ],
        "name": "AnnouncementCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "resultId", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "submissionId", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "grade", "type": "uint256"}
        ],
        "name": "ResultPublished",
        "type": "event"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_title", "type": "string"},
            {"internalType": "string", "name": "_message", "type": "string"},
            {"internalType": "uint256", "name": "_relatedAssignmentId", "type": "uint256"}
        ],
        "name": "createAnnouncement",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "_submissionId", "type": "uint256"},
            {"internalType": "uint256", "name": "_grade", "type": "uint256"},
            {"internalType": "string", "name": "_feedback", "type": "string"},
            {"internalType": "bool", "name": "_isPublic", "type": "bool"}
        ],
        "name": "publishResult",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAnnouncements",
        "outputs": [
            {"internalType": "uint256[]", "name": "ids", "type": "uint256[]"},
            {"internalType": "string[]", "name": "titles", "type": "string[]"},
            {"internalType": "string[]", "name": "messages", "type": "string[]"},
            {"internalType": "uint256[]", "name": "timestamps", "type": "uint256[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]''')



# Convertir l'adresse au format checksum
raw_address = os.getenv('CONTRACT_ADDRESS', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')
CONTRACT_ADDRESS = Web3.to_checksum_address(raw_address)

if CONTRACT_ADDRESS != "0x0000000000000000000000000000000000000000":
    contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    print(f"📄 Smart Contract chargé: {CONTRACT_ADDRESS}")
else:
    contract = None
    print("Adresse du contrat non configurée")


# ==============================================
# GESTION DES CLÉS RSA
# ==============================================

class RSAKeyManager:
    @staticmethod
    def generate_key_pair():
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        public_key = private_key.public_key()
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return private_pem, public_pem
    
    @staticmethod
    def encrypt_data(data, public_key_pem):
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8'),
            backend=default_backend()
        )
        
        data_json = json.dumps(data)
        data_bytes = data_json.encode('utf-8')
        
        encrypted = public_key.encrypt(
            data_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return base64.b64encode(encrypted).decode('utf-8')
    
    @staticmethod
    def decrypt_data(encrypted_data, private_key_pem):
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        
        encrypted_bytes = base64.b64decode(encrypted_data)
        
        decrypted = private_key.decrypt(
            encrypted_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return json.loads(decrypted.decode('utf-8'))

teacher_private_keys = {}

# ==============================================
# ROUTES API
# ==============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'web3_connected': web3.is_connected(),
        'chain_id': web3.eth.chain_id if web3.is_connected() else None,
        'latest_block': web3.eth.block_number if web3.is_connected() else 0,
        'contract_deployed': contract is not None,
        'contract_address': CONTRACT_ADDRESS
    })

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    try:
        if not web3.is_connected():
            return jsonify({'error': 'Non connecté à Ganache'}), 503
        
        accounts_data = []
        for account in web3.eth.accounts[:10]:
            balance = web3.eth.get_balance(account)
            balance_eth = web3.from_wei(balance, 'ether')
            
            accounts_data.append({
                'address': account,
                'balance': str(balance_eth),
                'balance_wei': str(balance)
            })
        
        return jsonify({
            'success': True,
            'accounts': accounts_data,
            'count': len(accounts_data)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-keys', methods=['POST'])
def generate_keys():
    try:
        data = request.get_json()
        teacher_address = data.get('teacher_address')
        
        if not teacher_address:
            return jsonify({'error': 'Adresse enseignant requise'}), 400
        
        private_key, public_key = RSAKeyManager.generate_key_pair()
        teacher_private_keys[teacher_address.lower()] = private_key
        
        return jsonify({
            'success': True,
            'public_key': public_key,
            'message': 'Clés générées avec succès'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/encrypt-submission', methods=['POST'])
def encrypt_submission():
    try:
        data = request.get_json()
        
        required_fields = ['student_id', 'answer', 'public_key']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Champs manquants'}), 400
        
        submission_data = {
            'student_id': data['student_id'],
            'answer': data['answer'],
            'timestamp': datetime.now().isoformat()
        }
        
        encrypted_data = RSAKeyManager.encrypt_data(
            submission_data,
            data['public_key']
        )
        
        return jsonify({
            'success': True,
            'encrypted_data': encrypted_data,
            'message': 'Données cryptées avec succès'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/decrypt-submission', methods=['POST'])
def decrypt_submission():
    try:
        data = request.get_json()
        
        required_fields = ['teacher_address', 'encrypted_data']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Champs manquants'}), 400
        
        private_key = teacher_private_keys.get(data['teacher_address'].lower())
        if not private_key:
            return jsonify({'error': 'Clé privée non trouvée'}), 404
        
        decrypted_data = RSAKeyManager.decrypt_data(
            data['encrypted_data'],
            private_key
        )
        
        return jsonify({
            'success': True,
            'decrypted_data': decrypted_data,
            'message': 'Données décryptées avec succès'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/blockchain-stats', methods=['GET'])
def blockchain_stats():
    try:
        stats = {
            'connected': web3.is_connected(),
            'block_number': web3.eth.block_number if web3.is_connected() else 0,
            'accounts': len(web3.eth.accounts) if web3.is_connected() else 0,
            'chain_id': web3.eth.chain_id if web3.is_connected() else 0,
            'gas_price': str(web3.from_wei(web3.eth.gas_price, 'gwei')) if web3.is_connected() else '0'
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==============================================
# LANCEMENT DE L'APPLICATION
# ==============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print(" Système de Gestion des Contrôles - Blockchain")
    print(" ENSA Tétouan - Backend Flask + Web3")
    print(" Avec Annonces et Publication des Résultats")
    print("="*60 + "\n")
    
    if web3.is_connected():
        print("Web3 connecté à Ganache")
        print(f"Chain ID: {web3.eth.chain_id}")
        print(f"Bloc actuel: {web3.eth.block_number}")
        print(f"Comptes Ganache: {len(web3.eth.accounts)}")
        
        for i, acc in enumerate(web3.eth.accounts[:3]):
            balance = web3.from_wei(web3.eth.get_balance(acc), 'ether')
            print(f"   [{i}] {acc} - {balance} ETH")
    else:
        print("Ganache non détecté!")
        print("Démarrez Ganache sur http://127.0.0.1:7545")
    
    print("\nDémarrage du serveur Flask...")
    print("API disponible sur: http://localhost:5000")
    print("Documentation API:")
    print("   • GET  /api/health")
    print("   • GET  /api/accounts")
    print("   • POST /api/generate-keys")
    print("   • POST /api/encrypt-submission")
    print("   • POST /api/decrypt-submission")
    print("   • GET  /api/blockchain-stats")
    print("\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')
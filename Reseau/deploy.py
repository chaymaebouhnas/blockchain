from web3 import Web3
import json
import os

# Configuration Ganache
GANACHE_URL = "http://127.0.0.1:7545"
web3 = Web3(Web3.HTTPProvider(GANACHE_URL))

# Vérifier la connexion
if not web3.is_connected():
    print(" Impossible de se connecter à Ganache")
    exit(1)

print(" Connecté à Ganache")
print(f"Chain ID: {web3.eth.chain_id}")

# Charger le bytecode et ABI du contrat compilé
# Vous devez compiler le contrat avec solc ou Remix d'abord
with open('AssignmentManagement.json', 'r') as f:
    contract_data = json.load(f)

# Récupérer le compte de déploiement (premier compte Ganache)
deployer_account = web3.eth.accounts[0]
print(f"Compte de déploiement: {deployer_account}")

# Créer l'instance du contrat
AssignmentContract = web3.eth.contract(
    abi=contract_data['abi'],
    bytecode=contract_data['bytecode']
)

# Déployer le contrat
print("\n Déploiement du contrat en cours...")
tx_hash = AssignmentContract.constructor().transact({
    'from': deployer_account,
    'gas': 6000000
})

# Attendre la confirmation
tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
contract_address = tx_receipt.contractAddress

print(f" Contrat déployé avec succès!")
print(f"Adresse du contrat: {contract_address}")
print(f"Gas utilisé: {tx_receipt.gasUsed}")

# Sauvegarder l'adresse du contrat
contract_info = {
    'address': contract_address,
    'abi': contract_data['abi'],
    'deployer': deployer_account,
    'network': 'Ganache Local',
    'ganache_url': GANACHE_URL
}

with open('contract_info.json', 'w') as f:
    json.dump(contract_info, f, indent=2)

print("\n Informations du contrat sauvegardées dans contract_info.json")
print("\n Comptes Ganache disponibles:")
for i, account in enumerate(web3.eth.accounts[:5]):
    balance = web3.eth.get_balance(account)
    print(f"  Compte {i}: {account} - Balance: {web3.from_wei(balance, 'ether')} ETH")
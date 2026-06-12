"""
Script pour compiler le contrat Solidity avec solcx
Installation: pip install py-solc-x
"""

from solcx import compile_standard, install_solc
import json

# Installer la version de Solidity
install_solc('0.8.0')

# Lire le fichier source
with open('AssignmentManagement.sol', 'r') as file:
    contract_source = file.read()

# Configuration de compilation
compiled_sol = compile_standard(
    {
        "language": "Solidity",
        "sources": {
            "AssignmentManagement.sol": {
                "content": contract_source
            }
        },
        "settings": {
            "outputSelection": {
                "*": {
                    "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                }
            }
        },
    },
    solc_version="0.8.0",
)

# Extraire le bytecode et l'ABI
contract_id = "AssignmentManagement.sol:AssignmentManagement"
bytecode = compiled_sol["contracts"]["AssignmentManagement.sol"]["AssignmentManagement"]["evm"]["bytecode"]["object"]
abi = compiled_sol["contracts"]["AssignmentManagement.sol"]["AssignmentManagement"]["abi"]

# Sauvegarder dans un fichier JSON
contract_data = {
    "abi": abi,
    "bytecode": bytecode
}

with open('AssignmentManagement.json', 'w') as f:
    json.dump(contract_data, f, indent=2)

print("✅ Contrat compilé avec succès!")
print(f"📄 ABI et Bytecode sauvegardés dans AssignmentManagement.json")
print(f"📊 Taille du bytecode: {len(bytecode)} caractères")
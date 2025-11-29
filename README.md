# Travel Log - Website + DApp

This repository contains two folders:

1. **website/** - A simple Web2 "My Travel Log" app (HTML/CSS/JS) that stores data in-memory.
2. **dapp/** - A minimal DApp example:
   - `contracts/TravelLog.sol` - Solidity smart contract.
   - `scripts/deploy.js` - Hardhat deployment script.
   - `frontend/` - Simple frontend that connects to MetaMask and interacts with the contract.

## Quick notes

- Replace placeholders in `dapp/frontend/dapp.js`:
  - `CONTRACT_ADDRESS` with the deployed contract address.
  - `CONTRACT_ABI` with the ABI from Hardhat artifacts (e.g., `artifacts/contracts/TravelLog.sol/TravelLog.json`).

- To compile & deploy (dapp):
  1. Install dependencies: `npm install`
  2. Compile: `npx hardhat compile`
  3. Configure `hardhat.config.js` with your RPC and private key.
  4. Deploy: `npx hardhat run scripts/deploy.js --network sepolia`

- This repo is intentionally minimal for workshop purposes. Feel free to expand:
  - Add validations, gas optimizations, IPFS support, or an indexer to share public entries.

## License
MIT

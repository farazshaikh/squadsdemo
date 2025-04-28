# Squads Protocol Demo

This repository demonstrates how to use Squads Protocol for managing Solana program deployments and updates through multisig governance.

## Project Structure

```
.
├── setup/              # Local Solana validator and wallet setup
├── solana_program/     # Our demo Solana program
└── squads_sdk/         # Squads integration and multisig operations
```

## Demo Overview

This demo showcases three main operations using Squads multisig:
1. Deploying a Solana program
2. Updating the program
3. Sending tokens to the program

## Setup Requirements

- Solana CLI (v2.2.1+)
- Rust and Cargo
- Node.js and npm
- Squads SDK (@sqds/multisig)

## Demo Steps

### 1. Local Environment Setup (`setup/`)
- Initialize local Solana validator
- Create test wallets for multisig members
- Configure local network settings

### 2. Solana Program (`solana_program/`)
- Simple program that can:
  - Receive and hold tokens
  - Execute basic instructions
  - Demonstrate upgradeable functionality

### 3. Squads Integration (`squads_sdk/`)
- Create multisig wallet
- Deploy program through multisig
- Perform program upgrade
- Execute token transfers

## Usage

Each directory contains its own README with specific instructions:

1. First run setup: `cd setup`
2. Build program: `cd solana_program`
3. Execute Squads operations: `cd squads_sdk`

## Security Notes

- This is a demo setup for learning purposes
- Use appropriate security measures in production
- Always verify transactions before signing
- Keep private keys secure

## References

- [Squads Protocol Documentation](https://docs.squads.so/)
- [Solana Program Development](https://docs.solana.com/developing/programming-model/overview)
- [Squads v4 GitHub](https://github.com/Squads-Protocol/v4)
# Local Setup

This directory contains scripts and instructions for setting up the local Solana development environment.

## Setup Methods

You can choose between two setup methods:

### 1. Using Bash Script (Recommended for most users)

```bash
# Make script executable
chmod +x scripts/setup.sh

# Run setup script
./scripts/setup.sh
```

The bash script will:
- Check for required dependencies
- Set up a local Solana validator
- Create test wallets
- Configure the local network
- Initialize the Squads SDK

### 2. Using Nix Shell (Recommended for reproducible environments)

```bash
# Enter Nix shell (requires Nix package manager)
nix-shell scripts/shell.nix

# Inside Nix shell, run the setup script
./scripts/setup.sh
```

The Nix shell provides:
- Pinned versions of all dependencies
- Reproducible development environment
- Automatic installation of required tools

## Directory Structure

```
setup/
├── scripts/
│   ├── setup.sh     # Bash setup script
│   └── shell.nix    # Nix shell configuration
├── wallets/         # Generated test wallets
└── test-validator/  # Local validator data
```

## Test Wallets

The setup creates three test wallets for multisig members:
- `member1.json`
- `member2.json`
- `member3.json`

Each wallet is airdropped 2 SOL on the local network.

## Local Validator

The local validator runs with the following configuration:
- RPC port: 8899
- Websocket port: 8900
- Reset on startup
- Clones the following from mainnet:
  - Squads V4 Program (`SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`)
  - Program Config Account (`BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr`)
  - Additional Config Account (`Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n`)

These cloned accounts ensure that the local validator has all necessary program data to run Squads operations.

## Network Configuration

The setup configures Solana CLI to use:
- URL: http://localhost:8899
- Websocket URL: ws://localhost:8900
- Commitment: confirmed

## Troubleshooting

1. If the validator fails to start:
   ```bash
   pkill -f solana-test-validator
   ./scripts/setup.sh
   ```

2. If airdrops fail:
   ```bash
   solana airdrop 2 <WALLET_ADDRESS>
   ```

3. To check validator status:
   ```bash
   solana cluster-version
   ```

## Files

- `member1.json`: First multisig member wallet
- `member2.json`: Second multisig member wallet
- `member3.json`: Third multisig member wallet

## Notes

- Keep the validator running in a separate terminal
- Make sure to have sufficient SOL balance for transactions
- Use these wallets only for local development 
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

## Creating the Multisig

After setting up the wallets and starting the validator, you can create a 2/3 multisig using:

```bash
create_multisig
```

This will:
1. Create a multisig with 3 members (using the demo wallets created earlier)
2. Set a threshold of 2 signatures required for any action
3. Give all members full permissions (value 7)

When you run the command:
1. You'll be prompted with "Do you want to proceed?" - type `yes` and press Enter
2. After confirmation, you'll see a transaction hash and the new multisig address
3. Copy the multisig address (it starts with a capital letter and is 32-44 characters long)
4. Save it to `.multisig_address` file:
   ```bash
   echo "YOUR_MULTISIG_ADDRESS" > .multisig_address
   ```

Example output:
```
Do you want to proceed? yes

⠠ Sending transaction...
Transaction confirmed: 5YWE6xav21GFeU6ngfM4jtNvDBMeKCfC2hGPSpT9dm7XYf5TM7zpDYjjw42pzZGhXHqek16Zg5FPmGyMq3zZcBJm

✅ Created Multisig: AT8SGmCfPmK4huy9NDUYjhtEETpnZxUUaL8h8TM77JrE
```

In this example, you would save `AT8SGmCfPmK4huy9NDUYjhtEETpnZxUUaL8h8TM77JrE` to `.multisig_address`.


## Demo Sequence ##
nix-shell setup/scripts/shell.nix
./demo.sh from the shell
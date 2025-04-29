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
1. Creating a multisig
2. Deploying a Solana program by a member of multisig
3. Transferring ownership of the program to the multisig

## Setup Requirements
nix-shell setup/scripts/shell.nix
This ideally should get you up and running.

## Security Notes

- This is a demo setup for learning purposes
- Use appropriate security measures in production
- Always verify transactions before signing
- Keep private keys secure

## References

- [Squads Protocol Documentation](https://docs.squads.so/)
- [Solana Program Development](https://docs.solana.com/developing/programming-model/overview)
- [Squads v4 GitHub](https://github.com/Squads-Protocol/v4)


## Demo Sequence ##
nix-shell setup/scripts/shell.nix
./demo.sh from the shell
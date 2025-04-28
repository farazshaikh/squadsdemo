#!/bin/bash

# RESET
# must be run from the nix shell at the root of the project
# nix-shell setup/scripts/shell.nix

set -euxo pipefail

# This script sets up a local Solana validator, creates demo wallets, deploys a program, and transfers ownership to a multisig.
# Ensure the script is run from the root of the project
# and that the necessary directories and files exist.
# Usage: ./demo.sh

# make member 1 king
solana config set --url http://127.0.0.1:8899
solana config set --keypair ./wallets/member1.json

create_demo_wallets
stop_validator
start_validator
sleep 10
fund_demo_wallets
create_multisig

# DEPLOY BY MEMBER1
rm -rf ./wallets/solana_counter-keypair.json
solana-keygen new --outfile ./wallets/solana_counter-keypair.json
solana program deploy ./solana_program/target/deploy/solana_counter.so --program-id ./wallets/solana_counter-keypair.json --keypair ./wallets/member1.json --upgrade-authority ./wallets/member1.json --url http://127.0.0.1:8899
PROGRAM_ID=$(solana address --keypair ./wallets/solana_counter-keypair.json)

# TRANSFER OWNERSHIP TO MULTISIG
cd ./squads_sdk
ts-node transfer_ownership.ts
solana config set --url http://127.0.0.1:8899 && solana config set --keypair ../wallets/member1.json && PROGRAM_ID=$(solana address -k ../wallets/solana_counter-keypair.json) && echo "Program ID: $PROGRAM_ID" && solana program show $PROGRAM_ID

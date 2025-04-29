#!/bin/bash

# RESET
# must be run from the nix shell at the root of the project
# nix-shell setup/scripts/shell.nix

set -euo pipefail

# build solana program that we deploy and demo tranfer of ownership
pushd ./solana_program
cargo build-sbf
popd

# Source the demo functions
source demo-functions

# This script sets up a local Solana validator, creates demo wallets, deploys a program, and transfers ownership to a multisig.
# Ensure the script is run from the root of the project
# and that the necessary directories and files exist.
# Usage: ./demo.sh

# make member 1 king
solana config set --url http://127.0.0.1:8899
solana config set --keypair ./wallets/member1.json


stop_validator
sleep 5
create_demo_wallets
start_validator
sleep 5
fund_demo_wallets

# DEPLOY BY MEMBER1
deploy_contract

# CREATE MULTISIG TO TAKE OWNERSHIP
create_multisig

# TRANSFER OWNERSHIP TO MULTISIG
transfer_contract_ownership
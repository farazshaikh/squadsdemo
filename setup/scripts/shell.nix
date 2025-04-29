# shell.nix
{ pkgs ? import <nixpkgs> { } }:

let
  # Pin versions
  solanaVersion = "1.18.0";
  nodeVersion = "20.x";

  # Create the demo functions script that will be available in PATH
  demoScript = pkgs.writeScriptBin "demo-functions" ''
    #!/usr/bin/env bash

    # Helper function to run commands in a directory and return
    run_in_dir() {
      local dir=$1
      shift
      pushd "$dir" >/dev/null || return 1
      "$@"
      local result=$?
      popd >/dev/null || return 1
      return $result
    }

    # Create demo wallets
    create_demo_wallets() {
      echo "Creating demo wallets..."
      # Create wallets directory if it doesn't exist
      mkdir -p wallets

      # Remove existing keypair file if it exists
      if [ ! -f "./wallets/solana_counter-keypair.json" ]; then
        solana-keygen new --no-bip39-passphrase -o ./wallets/solana_counter-keypair.json
        echo "Created solana_counter keypair: $(solana-keygen pubkey ./wallets/solana_counter-keypair.json)"
      fi

      # Create authority wallet (for program deployment)
      if [ ! -f "wallets/authority.json" ]; then
        solana-keygen new --no-bip39-passphrase -o wallets/authority.json
        echo "Created authority wallet: $(solana-keygen pubkey wallets/authority.json)"
      fi

      # Create multisig member wallets
      for i in {1..3}; do
        if [ ! -f "wallets/member$i.json" ]; then
          solana-keygen new --no-bip39-passphrase -o wallets/member$i.json
          echo "Created member$i wallet: $(solana-keygen pubkey wallets/member$i.json)"
        fi
      done

      # Create program upgrade authority wallet
      if [ ! -f "wallets/upgrade_authority.json" ]; then
        solana-keygen new --no-bip39-passphrase -o wallets/upgrade_authority.json
        echo "Created upgrade authority wallet: $(solana-keygen pubkey wallets/upgrade_authority.json)"
      fi

      # Create multisig create key
      if [ ! -f "wallets/create_key.json" ]; then
        solana-keygen new --no-bip39-passphrase -o wallets/create_key.json
        echo "Created multisig create key: $(solana-keygen pubkey wallets/create_key.json)"
      fi
    }

    # List all demo wallets and their balances
    list_demo_wallets() {
      echo "Demo wallets:"
      for wallet in wallets/*.json; do
        if [ -f "$wallet" ]; then
          pubkey=$(solana-keygen pubkey "$wallet")
          echo "$(basename "$wallet"): $pubkey"
          if solana config get | grep -q "http://127.0.0.1:8899"; then
            balance=$(solana balance "$pubkey" 2>/dev/null || echo "0 SOL")
            echo "  Balance: $balance"
          fi
        fi
      done
    }

    # Airdrop SOL to demo wallets
    fund_demo_wallets() {
      if ! solana config get | grep -q "http://127.0.0.1:8899"; then
        echo "Error: Must be connected to local validator"
        return 1
      fi

      echo "Funding demo wallets..."
      for wallet in wallets/*.json; do
        if [ -f "$wallet" ]; then
          pubkey=$(solana-keygen pubkey "$wallet")
          echo "Airdropping 2 SOL to $(basename "$wallet")..."
          solana airdrop 2 "$pubkey"
          # Double check balance and retry if needed
          balance=$(solana balance "$pubkey" 2>/dev/null || echo "0")
          if [ "$balance" = "0" ]; then
            echo "Retrying airdrop..."
            solana airdrop 2 "$pubkey"
          fi
        fi
      done

      # Verify all wallets have funds
      echo -e "\nVerifying wallet balances:"
      list_demo_wallets
    }

    # Function to clean up Solana validator
    stop_validator() {
      echo "Stopping Solana validator..."
      if [ -f "/tmp/solana-validator.pid" ]; then
        VALIDATOR_PID=$(cat /tmp/solana-validator.pid)
        kill "$VALIDATOR_PID" 2>/dev/null || true
        rm /tmp/solana-validator.pid
        echo "Validator stopped"
      else
        echo "No running validator found"
      fi
    }

    # Function to start Solana validator
    start_validator() {
      # First check if validator is already running
      if [ -f "/tmp/solana-validator.pid" ]; then
        echo "Validator is already running. Stop it first with 'stop_validator'"
        return 1
      fi

      # Check if we have demo wallets
      if [ ! -d "wallets" ] || [ -z "$(ls -A wallets 2>/dev/null)" ]; then
        echo "No demo wallets found. Run 'create_demo_wallets' first."
        return 1
      fi

      echo "Starting Solana validator..."
      # Create a temporary directory for validator data
      VALIDATOR_DIR=$(mktemp -d /tmp/solana-test-validator.XXXXXX)

      # Configure Solana to use our authority wallet
      solana config set --keypair wallets/authority.json --url http://127.0.0.1:8899

      # Start validator with Squads program and config accounts cloned from mainnet
      solana-test-validator \
        --reset \
        --url m \
        --clone-upgradeable-program SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf \
        --clone BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr \
        --clone Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n \
        --ledger "$VALIDATOR_DIR" \
        > /tmp/validator.log 2>&1 &

      # Store PID and directory
      echo $! > /tmp/solana-validator.pid
      echo "$VALIDATOR_DIR" > /tmp/solana-validator-dir

      # Wait for validator to start
      sleep 5
      echo "Solana validator started with data directory: $VALIDATOR_DIR"
      echo "Validator log available at: /tmp/validator.log"
      echo "Using authority wallet: $(solana-keygen pubkey wallets/authority.json)"
    }

    # Function to check validator status
    validator_status() {
      if [ -f "/tmp/solana-validator.pid" ]; then
        VALIDATOR_PID=$(cat /tmp/solana-validator.pid)
        if ps -p $VALIDATOR_PID > /dev/null; then
          echo "Validator is running (PID: $VALIDATOR_PID)"
          echo "Log file: /tmp/validator.log"
          solana cluster-version
        else
          echo "Validator process not found but PID file exists. Clean up with 'stop_validator'"
        fi
      else
        echo "No validator is running"
      fi
    }

    # Function to show validator logs
    validator_logs() {
      if [ -f "/tmp/validator.log" ]; then
        tail -f /tmp/validator.log
      else
        echo "No validator log file found"
      fi
    }

    # Function to create multisig using TypeScript SDK
    create_multisig() {
      # Check if validator is running
      if ! solana config get | grep -q "http://127.0.0.1:8899"; then
        echo "Error: Local validator not running. Start it with 'start_validator'"
        return 1
      fi

      # Check if we have the required wallets
      for wallet in member{1,2,3}.json create_key.json; do
        if [ ! -f "wallets/$wallet" ]; then
          echo "Error: $wallet not found. Run 'create_demo_wallets' first"
          return 1
        fi
      done

      echo "Creating multisig using Squads TypeScript SDK..."
      run_in_dir squads_sdk ts-node create_multisig.ts
    }

    # Function to verify multisig address
    verify_multisig() {
      if [ ! -f ".multisig_address" ]; then
        echo "Error: No multisig address found. Run 'create_multisig' first"
        return 1
      fi

      if [ ! -f "wallets/create_key.json" ]; then
        echo "Error: create_key.json not found. Run 'create_demo_wallets' first"
        return 1
      fi

      echo "Verifying multisig address using Squads TypeScript SDK..."
      run_in_dir squads_sdk ts-node verify_multisig.ts
    }

    # Export all functions so they're available when sourced
    export -f run_in_dir
    export -f create_demo_wallets
    export -f list_demo_wallets
    export -f fund_demo_wallets
    export -f stop_validator
    export -f start_validator
    export -f validator_status
    export -f validator_logs
    export -f create_multisig
    export -f verify_multisig

    # Print usage if script is run directly
    if [[ "$0" == "$BASH_SOURCE" ]]; then
      echo "This script is meant to be sourced to get access to demo functions."
      echo "Usage: source $(basename "$0")"
      echo ""
      echo "Available functions:"
      echo "Demo setup:"
      echo "  create_demo_wallets  - Create authority and member wallets"
      echo "  list_demo_wallets    - Show all demo wallets and balances"
      echo "  fund_demo_wallets    - Airdrop SOL to all demo wallets"
      echo "  create_multisig      - Create 2/3 multisig using TypeScript SDK"
      echo "  verify_multisig      - Verify multisig address using TypeScript SDK"
      echo ""
      echo "Validator management:"
      echo "  start_validator      - Start Solana validator with Squads program"
      echo "  stop_validator       - Stop running validator"
      echo "  validator_status     - Check validator status"
      echo "  validator_logs       - Show validator logs (tail -f)"
    fi
  '';

in pkgs.mkShell {
  buildInputs = with pkgs; [
    # Demo script
    demoScript

    # Rust toolchain for Solana program development
    rustc
    cargo
    rustfmt
    clippy
    rust-analyzer
    pkg-config
    libudev-zero

    # Node.js environment for Squads SDK
    nodejs_20
    nodePackages_latest.npm
    nodePackages_latest.typescript
    nodePackages_latest.ts-node
    nodePackages_latest.yarn

    # Development tools
    pkg-config
    openssl
    jq # For JSON processing in scripts
    expect # For handling interactive prompts

    # Git and basic utils
    git
    curl
    wget
  ];

  shellHook = ''
    # Configure npm to use HTTPS
    npm config set registry https://registry.npmjs.org/

    # Install squads_sdk dependencies if needed
    if [ -f "squads_sdk/package.json" ] && [ ! -d "squads_sdk/node_modules" ]; then
      echo "Installing Squads SDK dependencies..."
      run_in_dir squads_sdk npm install
    fi

    # Source our demo functions
    source demo-functions

    # Set environment variables
    export PATH=$PATH:$HOME/.local/share/solana/install/active_release/bin
    export RUST_LOG=info
    export NODE_TLS_REJECT_UNAUTHORIZED=1

    # Print available commands
    echo ""
    echo "Available commands:"
    echo "Demo setup:"
    echo "  create_demo_wallets  - Create authority and member wallets"
    echo "  list_demo_wallets    - Show all demo wallets and balances"
    echo "  fund_demo_wallets    - Airdrop SOL to all demo wallets"
    echo "  create_multisig      - Create 2/3 multisig using TypeScript SDK"
    echo "  verify_multisig      - Verify multisig address using TypeScript SDK"
    echo ""
    echo "Validator management:"
    echo "  start_validator      - Start Solana validator with Squads program"
    echo "  stop_validator       - Stop running validator"
    echo "  validator_status     - Check validator status"
    echo "  validator_logs       - Show validator logs (tail -f)"
    echo ""
  '';

  # Environment variables
  SOLANA_VERSION = solanaVersion;
}

#!/usr/bin/env bash

set -e # Exit on error
set -u # Exit on undefined variable
set -o pipefail # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill validator if running
    if [ -f "/tmp/solana-validator-pid" ]; then
        VALIDATOR_PID=$(cat /tmp/solana-validator-pid)
        kill "$VALIDATOR_PID" 2>/dev/null || true
        rm /tmp/solana-validator-pid
    fi
    
    # Remove validator directory
    if [ -f "/tmp/solana-validator-dir" ]; then
        VALIDATOR_DIR=$(cat /tmp/solana-validator-dir)
        rm -rf "$VALIDATOR_DIR"
        rm /tmp/solana-validator-dir
    fi
}

# Set up trap to call cleanup function on script exit
trap cleanup EXIT

# Print with color
print_status() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    print_status "$1 is installed"
    return 0
}

# Check and install dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Rust
    if ! check_command rustc; then
        missing_deps+=("rust")
    fi
    
    # Check Solana
    if ! check_command solana; then
        missing_deps+=("solana")
    fi
    
    # Check Node.js
    if ! check_command node; then
        missing_deps+=("nodejs")
    fi
    
    # Check npm
    if ! check_command npm; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install missing dependencies and run this script again"
        exit 1
    fi
    
    print_status "All dependencies are installed"
}

# Setup local Solana validator
setup_validator() {
    print_status "Setting up local Solana validator..."
    
    # Create temporary directory for validator
    VALIDATOR_DIR=$(mktemp -d -t solana-validator-XXXXXXXXXX)
    print_status "Using temporary directory: $VALIDATOR_DIR"
    
    # Kill any running validator
    pkill -f solana-test-validator || true
    
    # Start validator in background with Squads program and config accounts cloned from mainnet
    cd "$VALIDATOR_DIR"
    solana-test-validator \
        --url m \
        --clone-upgradeable-program SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf \
        -c BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr \
        -c Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n \
        --quiet \
        --reset &
    VALIDATOR_PID=$!
    
    # Store validator directory and PID for cleanup
    echo "$VALIDATOR_DIR" > /tmp/solana-validator-dir
    echo "$VALIDATOR_PID" > /tmp/solana-validator-pid
    
    # Wait for validator to start
    sleep 5
    
    print_status "Local validator started with PID: $VALIDATOR_PID"
    print_status "Validator data directory: $VALIDATOR_DIR"
    
    # Return to original directory
    cd - > /dev/null
}

# Create test wallets
create_wallets() {
    print_status "Creating test wallets..."
    
    # Create directory for wallets
    mkdir -p wallets
    cd wallets
    
    # Create wallets for multisig members
    for i in {1..3}; do
        if [ ! -f "member${i}.json" ]; then
            solana-keygen new --no-bip39-passphrase -o "member${i}.json"
            print_status "Created wallet for member ${i}"
            
            # Airdrop SOL (2 SOL each)
            solana airdrop 2 "$(solana-keygen pubkey member${i}.json)" \
                || print_warning "Failed to airdrop to member ${i}"
        else
            print_status "Wallet for member ${i} already exists"
        fi
    done
    
    cd ..
}

# Configure local network
configure_network() {
    print_status "Configuring local network..."
    
    # Set to localhost
    solana config set --url localhost
    
    # Show current configuration
    solana config get
}

# Initialize npm project for Squads SDK
setup_squads_sdk() {
    print_status "Setting up Squads SDK..."
    
    cd ../squads_sdk
    
    # Initialize npm project if package.json doesn't exist
    if [ ! -f "package.json" ]; then
        npm init -y
        npm install @sqds/multisig
    fi
    
    cd ../setup
}

# Main setup function
main() {
    print_status "Starting local environment setup..."
    
    # Create setup directory if running from root
    if [ ! -d "setup" ]; then
        cd setup
    fi
    
    check_dependencies
    setup_validator
    create_wallets
    configure_network
    setup_squads_sdk
    
    print_status "Setup completed successfully!"
    print_status "Local validator is running in background"
    print_status "Test wallets created in setup/wallets/"
    print_status "Network configured to localhost"
}

# Run main function
main 
#!/usr/bin/env bash

set -e # Exit on error
set -u # Exit on undefined variable
set -o pipefail # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    
    # Create test validator directory
    mkdir -p test-validator
    cd test-validator
    
    # Kill any running validator
    pkill -f solana-test-validator || true
    
    # Start validator in background
    solana-test-validator --quiet --reset &
    VALIDATOR_PID=$!
    
    # Wait for validator to start
    sleep 5
    
    print_status "Local validator started with PID: $VALIDATOR_PID"
    cd ..
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
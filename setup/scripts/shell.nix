# shell.nix
{ pkgs ? import <nixpkgs> { } }:

let
  # Pin Solana version
  solanaVersion = "1.18.0";

  # Custom derivation for Solana CLI
  solana = pkgs.stdenv.mkDerivation {
    name = "solana-cli";
    version = solanaVersion;

    src = pkgs.fetchurl {
      url =
        "https://github.com/solana-labs/solana/releases/download/v${solanaVersion}/solana-release-x86_64-unknown-linux-gnu.tar.bz2";
      sha256 = ""; # Add SHA256 of the download
    };

    buildInputs = with pkgs; [ autoPatchelfHook openssl zlib ];

    installPhase = ''
      mkdir -p $out/bin
      cp -r bin/* $out/bin/
    '';
  };

in pkgs.mkShell {
  buildInputs = with pkgs; [
    # Rust toolchain
    rustc
    cargo
    rustfmt
    clippy

    # Node.js environment
    nodejs
    nodePackages.npm

    # Solana (commented out until we have proper SHA)
    # solana

    # Development tools
    pkg-config
    openssl

    # Git and basic utils
    git
    curl
    wget
  ];

  # Shell hook for environment setup
  shellHook = ''
    # Set environment variables
    export PATH=$PATH:$HOME/.local/share/solana/install/active_release/bin
    export RUST_LOG=info

    # Check Solana installation
    if ! command -v solana &> /dev/null; then
      echo "Solana CLI not found. Installing..."
      sh -c "$(curl -sSfL https://release.solana.com/v${solanaVersion}/install)"
    fi

    # Install Squads CLI if not present
    if ! command -v squads-multisig-cli &> /dev/null; then
      echo "Installing Squads CLI..."
      cargo install squads-multisig-cli
    fi

    # Print versions
    echo "Environment versions:"
    rustc --version
    cargo --version
    node --version
    npm --version
    solana --version
    squads-multisig-cli --version || echo "Squads CLI version check failed"

    # Create local directories
    mkdir -p test-validator wallets
  '';

  # Environment variables
  RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
}

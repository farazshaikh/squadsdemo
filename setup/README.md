# Local Setup

This directory contains scripts and instructions for setting up the local Solana development environment.

## Steps

1. Start Local Validator
```bash
solana-test-validator
```

2. Create Test Wallets
```bash
# Create wallets for multisig members
solana-keygen new --outfile member1.json
solana-keygen new --outfile member2.json
solana-keygen new --outfile member3.json

# Airdrop SOL to each wallet
solana airdrop 2 $(solana-keygen pubkey member1.json)
solana airdrop 2 $(solana-keygen pubkey member2.json)
solana airdrop 2 $(solana-keygen pubkey member3.json)
```

3. Configure Local Network
```bash
solana config set --url localhost
```

## Files

- `member1.json`: First multisig member wallet
- `member2.json`: Second multisig member wallet
- `member3.json`: Third multisig member wallet

## Notes

- Keep the validator running in a separate terminal
- Make sure to have sufficient SOL balance for transactions
- Use these wallets only for local development 
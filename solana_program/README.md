# Demo Solana Program

A simple Solana program that demonstrates:
- Token receiving capability
- Upgradeable functionality
- Basic instruction processing

## Program Structure

```rust
// Main program entry point
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Process instructions here
}
```

## Building

```bash
# Build the program
cargo build-bpf

# Generate program keypair
solana-keygen new -o program-keypair.json
```

## Program Features

1. Token Operations
   - Receive tokens
   - Check token balance
   - Transfer tokens (for upgrade demo)

2. Upgrade Functionality
   - Program is deployed as upgradeable
   - Controlled by multisig authority

## Testing

```bash
# Run program tests
cargo test-bpf
```

## Notes

- Program ID is generated during build
- Keep program simple for demo purposes
- Upgrade authority will be transferred to multisig 
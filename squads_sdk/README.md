# Squads Integration

This directory contains the Squads multisig integration code and examples.

## Setup

```bash
# Install dependencies
npm install @sqds/multisig
```

## Operations

1. Create Multisig
```typescript
// Initialize Squads client
const multisig = new Multisig();

// Create new multisig
const createTx = await multisig.createMultisig({
    threshold: 2,
    members: [member1, member2, member3],
    timeLock: 0,
    memo: "Demo Multisig"
});
```

2. Deploy Program
```typescript
// Create deployment transaction
const deployTx = await multisig.createProgramDeployTransaction({
    programId: NEW_PROGRAM_ID,
    buffer: BUFFER_ADDRESS,
    authority: MULTISIG_ADDRESS
});
```

3. Upgrade Program
```typescript
// Create upgrade transaction
const upgradeTx = await multisig.createProgramUpgradeTransaction({
    programId: PROGRAM_ID,
    buffer: NEW_BUFFER_ADDRESS,
    spillAddress: SPILL_ADDRESS
});
```

4. Token Operations
```typescript
// Create token transfer transaction
const transferTx = await multisig.createTokenTransferTransaction({
    source: SOURCE_TOKEN_ACCOUNT,
    destination: PROGRAM_TOKEN_ACCOUNT,
    amount: AMOUNT
});
```

## Files

- `create-multisig.ts`: Multisig creation example
- `deploy-program.ts`: Program deployment example
- `upgrade-program.ts`: Program upgrade example
- `token-ops.ts`: Token operations example

## Notes

- All operations require member signatures
- Check transaction status before execution
- Verify all addresses and amounts
- Test with small amounts first 
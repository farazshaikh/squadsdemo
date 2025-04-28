import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import fs from 'fs';
import path from 'path';

// Counter instruction enum class matching our Rust program
class CounterInstruction {
  instruction: number;
  static schema = new Map([
    [CounterInstruction, { kind: 'struct', fields: [['instruction', 'u8']] }],
  ]);

  constructor(instruction: number) {
    this.instruction = instruction;
  }

  static initialize() {
    return new CounterInstruction(0);
  }

  static increment() {
    return new CounterInstruction(1);
  }

  serialize(): Buffer {
    return Buffer.from(borsh.serialize(CounterInstruction.schema, this));
  }
}

async function main() {
  // Connect to local Solana cluster
  const connection = new Connection('http://localhost:8899', 'confirmed');

  // Load the program keypair
  const programKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync('program-keypair.json', 'utf-8')))
  );
  const programId = programKeypair.publicKey;

  // Generate a new account to store the counter
  const counterAccount = Keypair.generate();
  const space = 8; // Space for the counter (u64)

  // Calculate rent-exempt balance
  const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(space);

  // Create account transaction
  const createAccountTx = SystemProgram.createAccount({
    fromPubkey: programKeypair.publicKey,
    newAccountPubkey: counterAccount.publicKey,
    lamports: rentExemptBalance,
    space,
    programId,
  });

  // Initialize counter instruction
  const initializeIx = new TransactionInstruction({
    keys: [{ pubkey: counterAccount.publicKey, isSigner: false, isWritable: true }],
    programId,
    data: CounterInstruction.initialize().serialize(),
  });

  // Send transaction
  const tx = new Transaction().add(createAccountTx).add(initializeIx);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [
      programKeypair,
      counterAccount,
    ]);
    console.log('Program deployed and counter initialized!');
    console.log('Transaction signature:', signature);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 
import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  SystemProgram,
  BpfLoader,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import * as fs from 'fs';
import BN from 'bn.js';

// Use longer timeout and skipPreflight
const connection = new Connection("http://127.0.0.1:8899", {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000,
});

// BPFLoader program ID
const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

async function createAndConfirmTransaction(
  connection: Connection,
  member1: Keypair,
  member2: Keypair,
  multisigPda: PublicKey,
  transactionIndex: bigint,
  instructions: TransactionInstruction[],
  memo: string,
  ephemeralSigners: number = 0
) {
  const message = new TransactionMessage({
    payerKey: multisigPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions,
  });

  // Create the transaction proposal
  const createTxSignature = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer: member1,
    multisigPda,
    transactionIndex,
    creator: member1.publicKey,
    vaultIndex: 0,
    ephemeralSigners,
    transactionMessage: message,
    memo,
    sendOptions: { skipPreflight: true },
  });

  await connection.confirmTransaction(createTxSignature);
  console.log("Transaction created:", createTxSignature);

  // Create proposal
  const proposalSignature = await multisig.rpc.proposalCreate({
    connection,
    feePayer: member1,
    multisigPda,
    transactionIndex,
    creator: member1,
    sendOptions: { skipPreflight: true },
  });

  await connection.confirmTransaction(proposalSignature);
  console.log("Proposal created:", proposalSignature);

  // First approval (member1)
  const approval1 = await multisig.rpc.proposalApprove({
    connection,
    feePayer: member1,
    multisigPda,
    transactionIndex,
    member: member1,
    sendOptions: { skipPreflight: true },
  });

  await connection.confirmTransaction(approval1);
  console.log("Member 1 approved:", approval1);

  // Second approval (member2)
  const approval2 = await multisig.rpc.proposalApprove({
    connection,
    feePayer: member1,
    multisigPda,
    transactionIndex,
    member: member2,
    sendOptions: { skipPreflight: true },
  });

  await connection.confirmTransaction(approval2);
  console.log("Member 2 approved:", approval2);

  console.log("Executing transaction...");

  // Execute the transaction
  const executeTxSignature = await multisig.rpc.vaultTransactionExecute({
    connection,
    feePayer: member1,
    multisigPda,
    transactionIndex,
    member: member1.publicKey,
    signers: [member1],
    sendOptions: { skipPreflight: true },
  });

  await connection.confirmTransaction(executeTxSignature);
  console.log("Transaction executed:", executeTxSignature);
}

async function main() {
  try {
    // Load member wallets
    const member1 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('wallets/member1.json', 'utf-8')))
    );
    const member2 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('wallets/member2.json', 'utf-8')))
    );
    const member3 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('wallets/member3.json', 'utf-8')))
    );
    const createKey = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('wallets/create_key.json', 'utf-8')))
    );

    // Get the multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
    });

    console.log("Using multisig address:", multisigPda.toBase58());

    // Read the program binary
    const programData = fs.readFileSync('solana_program/target/deploy/solana_counter.so');
    console.log("Program size:", programData.length, "bytes");
    
    // Create program and buffer accounts
    const programKeypair = Keypair.generate();
    const bufferAccount = Keypair.generate();
    
    // Calculate rent
    const programDataSize = programData.length;
    const programRent = await connection.getMinimumBalanceForRentExemption(programDataSize);
    const bufferRent = await connection.getMinimumBalanceForRentExemption(programDataSize);

    console.log("Program ID will be:", programKeypair.publicKey.toBase58());

    // Get current transaction index
    const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );
    let currentIndex = Number(multisigAccount.transactionIndex);

    // Create program account
    await createAndConfirmTransaction(
      connection,
      member1,
      member2,
      multisigPda,
      BigInt(currentIndex + 1),
      [
        SystemProgram.createAccount({
          fromPubkey: multisigPda,
          newAccountPubkey: programKeypair.publicKey,
          lamports: programRent,
          space: programDataSize,
          programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
        })
      ],
      "Create program account",
      1
    );
    currentIndex++;

    // Create buffer account
    await createAndConfirmTransaction(
      connection,
      member1,
      member2,
      multisigPda,
      BigInt(currentIndex + 1),
      [
        SystemProgram.createAccount({
          fromPubkey: multisigPda,
          newAccountPubkey: bufferAccount.publicKey,
          lamports: bufferRent,
          space: programDataSize,
          programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
        })
      ],
      "Create buffer account",
      1
    );
    currentIndex++;

    // Write program data to buffer in chunks
    const chunkSize = 800; // Solana has instruction size limits
    for (let i = 0; i < programData.length; i += chunkSize) {
      const chunk = programData.slice(i, Math.min(i + chunkSize, programData.length));
      await createAndConfirmTransaction(
        connection,
        member1,
        member2,
        multisigPda,
        BigInt(currentIndex + 1),
        [
          new TransactionInstruction({
            programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
            keys: [
              { pubkey: bufferAccount.publicKey, isSigner: true, isWritable: true },
            ],
            data: Buffer.concat([
              Buffer.from([0x01]), // Write instruction
              new BN(i).toArrayLike(Buffer, "le", 4), // Offset
              Buffer.from(chunk),
            ]),
          })
        ],
        `Write program chunk ${i}/${programData.length}`,
        1
      );
      currentIndex++;
      console.log(`Wrote chunk ${i}/${programData.length}`);
    }

    // Deploy program
    await createAndConfirmTransaction(
      connection,
      member1,
      member2,
      multisigPda,
      BigInt(currentIndex + 1),
      [
        new TransactionInstruction({
          programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
          keys: [
            { pubkey: bufferAccount.publicKey, isSigner: true, isWritable: true },
            { pubkey: programKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: multisigPda, isSigner: true, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
          ],
          data: Buffer.from([0x03]), // Deploy instruction
        })
      ],
      "Deploy program",
      2
    );

    console.log("Program deployed through multisig at:", programKeypair.publicKey.toBase58());

  } catch (error) {
    console.error("Error deploying program:", error);
  }
}

main();
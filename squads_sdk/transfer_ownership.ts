import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
} from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';

const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// Helper to get wallet path in parent directory
const getWalletPath = (filename: string) => path.join('..', 'wallets', filename);
const getProgramPath = (filename: string) => path.join('..', 'program_wallets', filename);

async function getProgramDataAddress(programId: PublicKey): Promise<PublicKey> {
  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
  );
  return programDataAddress;
}

async function verifyProgramAuthority(programId: PublicKey, expectedAuthority: PublicKey | null = null): Promise<{ programDataAddress: PublicKey; currentAuthority: PublicKey }> {
  try {
    const programDataAddress = await getProgramDataAddress(programId);
    const accountInfo = await connection.getAccountInfo(programDataAddress);
    
    if (!accountInfo) {
      throw new Error("Failed to fetch program data account info");
    }

    // The authority is at offset 13 in the program data account
    const currentAuthority = new PublicKey(accountInfo.data.slice(13, 45));
    
    // Check if the upgrade authority matches expected (if provided)
    if (expectedAuthority && !currentAuthority.equals(expectedAuthority)) {
      throw new Error("Program upgrade authority does not match expected authority");
    }

    return { programDataAddress, currentAuthority };
  } catch (error) {
    throw error;
  }
}

async function main() {
  try {
    console.log("Checking validator connection...");
    await connection.getVersion();
    console.log("Successfully connected to validator\n");

    // Load member1 keypair (current program owner)
    const member1 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('member1.json'), 'utf-8')))
    );

    // Load member2 keypair for approval
    const member2 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('member2.json'), 'utf-8')))
    );

    // Get multisig address from file
    const multisigAddress = fs.readFileSync(path.join('..', '.multisig_address'), 'utf-8').trim();
    const multisigPda = new PublicKey(multisigAddress);

    // Load program keypair and derive program ID
    const programKeypairData = new Uint8Array(JSON.parse(fs.readFileSync(getProgramPath('solana_counter-keypair.json'), 'utf-8')));
    const programKeypair = Keypair.fromSecretKey(programKeypairData);
    const programId = programKeypair.publicKey;

    console.log("--- Initial State ---");
    console.log("Program ID:", programId.toBase58());
    
    // Get and verify program data address
    const { programDataAddress, currentAuthority } = await verifyProgramAuthority(programId, member1.publicKey);
    console.log("Program Data Address:", programDataAddress.toBase58());
    console.log("Multisig Address:", multisigPda.toBase58());
    console.log("Current Owner:", currentAuthority.toBase58());

    // Create the instruction to set upgrade authority
    const instruction = {
      programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
      keys: [
        { pubkey: programDataAddress, isSigner: false, isWritable: true },
        { pubkey: member1.publicKey, isSigner: true, isWritable: false },
        { pubkey: multisigPda, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([
        Buffer.from([4]), // SetAuthority instruction
        Buffer.alloc(4),  // Padding for alignment
        multisigPda.toBuffer() // New authority
      ])
    };

    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transaction message
    const transactionMessage = new TransactionMessage({
      payerKey: member1.publicKey,
      recentBlockhash: blockhash,
      instructions: [instruction]
    });

    // Get the current multisig transaction index
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );

    const currentTransactionIndex = Number(multisigInfo.transactionIndex);
    const newTransactionIndex = BigInt(currentTransactionIndex + 1);

    console.log("\n--- Creating Transaction ---");
    console.log("Current Transaction Index:", currentTransactionIndex);
    console.log("New Transaction Index:", newTransactionIndex.toString());

    // Create the vault transaction
    const createTxSignature = await multisig.rpc.vaultTransactionCreate({
      connection,
      feePayer: member1,
      multisigPda: multisigPda,
      transactionIndex: newTransactionIndex,
      creator: member1.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage,
      memo: "Transfer program ownership to multisig"
    });

    await connection.confirmTransaction(createTxSignature);
    console.log("Transaction created:", createTxSignature);

    // Create the proposal
    const proposalSignature = await multisig.rpc.proposalCreate({
      connection,
      feePayer: member1,
      multisigPda: multisigPda,
      transactionIndex: newTransactionIndex,
      creator: member1
    });

    await connection.confirmTransaction(proposalSignature);
    console.log("Proposal created:", proposalSignature);

    // Have member1 approve
    console.log("\n--- Member Approvals ---");
    console.log("Member 1 approving...");
    const approval1Signature = await multisig.rpc.proposalApprove({
      connection,
      feePayer: member1,
      multisigPda: multisigPda,
      transactionIndex: newTransactionIndex,
      member: member1
    });
    await connection.confirmTransaction(approval1Signature);
    console.log("Member 1 approved:", approval1Signature);

    // Have member2 approve
    console.log("\nMember 2 approving...");
    const approval2Signature = await multisig.rpc.proposalApprove({
      connection,
      feePayer: member1,
      multisigPda: multisigPda,
      transactionIndex: newTransactionIndex,
      member: member2
    });
    await connection.confirmTransaction(approval2Signature);
    console.log("Member 2 approved:", approval2Signature);

    // Execute the transaction
    console.log("\n--- Executing Transaction ---");
    const executeTxSignature = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: member1,
      multisigPda: multisigPda,
      transactionIndex: newTransactionIndex,
      member: member1.publicKey,
      signers: [member1],
      sendOptions: { skipPreflight: true }
    });

    await connection.confirmTransaction(executeTxSignature);
    console.log("Transaction executed:", executeTxSignature);

    // Verify the transfer
    console.log("\n--- Verifying Transfer ---");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for chain to settle
    const { currentAuthority: finalAuthority } = await verifyProgramAuthority(programId);
    console.log("Final Authority:", finalAuthority.toBase58());
    console.log("Expected Authority (Multisig):", multisigPda.toBase58());

    if (finalAuthority.toBase58() === multisigPda.toBase58()) {
      console.log("\n✅ SUCCESS: Program ownership has been transferred to the multisig!");
    } else {
      console.log("\n❌ ERROR: Program ownership transfer failed!");
      console.log("Current owner is still:", finalAuthority.toBase58());
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();

import { Connection, Keypair, PublicKey, TransactionInstruction, TransactionMessage } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import * as fs from "fs";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForValidator(connection: Connection, maxRetries = 5): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log("Checking validator connection...");
      await connection.getLatestBlockhash();
      console.log("Successfully connected to validator");
      return true;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Failed to connect to validator after", maxRetries, "attempts");
        return false;
      }
      console.log("Validator not ready, retrying in 2 seconds...");
      await sleep(2000);
    }
  }
  return false;
}

async function verifyProgramAuthority(connection: Connection, programDataAddress: PublicKey): Promise<PublicKey> {
  const programDataAccountInfo = await connection.getAccountInfo(programDataAddress);
  if (!programDataAccountInfo) {
    throw new Error("Failed to fetch program data account info");
  }

  // Authority is at offset 13
  return new PublicKey(programDataAccountInfo.data.slice(13, 45));
}

async function main() {
  try {
    // Initialize connection with longer timeout
    const connection = new Connection("http://127.0.0.1:8899", {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000 // 60 seconds timeout
    });

    // Wait for validator to be ready
    if (!await waitForValidator(connection)) {
      console.error("\nPlease ensure your local validator is running with:");
      console.error("solana-test-validator --url m --clone-upgradeable-program SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf -c BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBXvoSeXMvwb4cNZr -c Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n");
      process.exit(1);
    }

    // Load member1 keypair (current program owner)
    const member1 = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("../wallets/member1.json", "utf8")))
    );

    // Load member2 keypair
    const member2 = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("../wallets/member2.json", "utf8")))
    );

    // Load multisig address
    const multisigAddress = fs.readFileSync("../.multisig_address", "utf8").trim();
    const multisigPDA = new PublicKey(multisigAddress);

    // Load program ID from deployed program keypair
    const programKeypairData = JSON.parse(
      fs.readFileSync("../program_wallets/solana_counter-keypair.json", "utf8")
    );
    const programId = new PublicKey(programKeypairData.slice(32, 64));

    // Known ProgramData address from solana program show
    const programDataAddress = new PublicKey("4Cwm9SAvzfFgC7E2F6mm6QgRBn7HydiGtvChq9fPbNDh");

    console.log("\n--- Initial State ---");
    console.log("Program ID:", programId.toBase58());
    console.log("Program Data Address:", programDataAddress.toBase58());
    console.log("Multisig Address:", multisigPDA.toBase58());
    console.log("Current Owner:", member1.publicKey.toBase58());

    // Verify initial program authority
    const initialAuthority = await verifyProgramAuthority(connection, programDataAddress);
    console.log("Verified Initial Authority:", initialAuthority.toBase58());
    if (initialAuthority.toBase58() !== member1.publicKey.toBase58()) {
      throw new Error("Initial authority doesn't match expected owner");
    }

    // Get the vault PDA for the transaction
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: multisigPDA,
      index: 0
    });
    console.log("Vault PDA:", vaultPda.toBase58());

    // Create the SetUpgradeAuthority instruction
    const instruction = new TransactionInstruction({
      programId: new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111"),
      keys: [
        { pubkey: programDataAddress, isSigner: false, isWritable: true },
        { pubkey: member1.publicKey, isSigner: true, isWritable: false }, // Current authority must sign
        { pubkey: multisigPDA, isSigner: false, isWritable: false }  // New authority
      ],
      data: Buffer.concat([
        Buffer.from([4]), // SetAuthority instruction
        Buffer.alloc(4), // Padding for alignment
        multisigPDA.toBuffer() // New authority
      ])
    });

    // Create the transaction message
    const transferMessage = new TransactionMessage({
      payerKey: member1.publicKey, // member1 pays and signs
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [instruction]
    });

    // Get the current multisig transaction index
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPDA
    );

    const currentTransactionIndex = Number(multisigInfo.transactionIndex);
    const newTransactionIndex = BigInt(currentTransactionIndex + 1);

    console.log("\n--- Creating Transaction ---");
    console.log("Current Transaction Index:", currentTransactionIndex);
    console.log("New Transaction Index:", newTransactionIndex.toString());

    // Create and submit the proposal
    const signature1 = await multisig.rpc.vaultTransactionCreate({
      connection,
      feePayer: member1,
      multisigPda: multisigPDA,
      transactionIndex: newTransactionIndex,
      creator: member1.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: transferMessage,
      memo: "Transfer program ownership to multisig"
    });

    await connection.confirmTransaction(signature1);
    console.log("Transaction created:", signature1);

    const signature2 = await multisig.rpc.proposalCreate({
      connection,
      feePayer: member1,
      multisigPda: multisigPDA,
      transactionIndex: newTransactionIndex,
      creator: member1
    });

    await connection.confirmTransaction(signature2);
    console.log("Proposal created:", signature2);

    // Have member1 approve the transaction
    console.log("\n--- Member Approvals ---");
    console.log("Member 1 approving transaction...");
    const approvalSig1 = await multisig.rpc.proposalApprove({
      connection,
      feePayer: member1,
      multisigPda: multisigPDA,
      transactionIndex: newTransactionIndex,
      member: member1
    });
    await connection.confirmTransaction(approvalSig1);
    console.log("Member 1 approved:", approvalSig1);

    // Have member2 approve the transaction
    console.log("\nMember 2 approving transaction...");
    const approvalSig2 = await multisig.rpc.proposalApprove({
      connection,
      feePayer: member1, // member1 pays fees but member2 signs
      multisigPda: multisigPDA,
      transactionIndex: newTransactionIndex,
      member: member2
    });
    await connection.confirmTransaction(approvalSig2);
    console.log("Member 2 approved:", approvalSig2);

    // Execute the transaction
    console.log("\n--- Executing Transaction ---");
    const executeSig = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: member1,
      multisigPda: multisigPDA,
      transactionIndex: newTransactionIndex,
      member: member1.publicKey,
      signers: [member1],
      sendOptions: { skipPreflight: true }
    });
    await connection.confirmTransaction(executeSig);
    console.log("Transaction executed:", executeSig);

    // Verify the transfer
    console.log("\n--- Verifying Transfer ---");
    await sleep(2000); // Wait for chain to settle
    const finalAuthority = await verifyProgramAuthority(connection, programDataAddress);
    console.log("Final Authority:", finalAuthority.toBase58());
    console.log("Expected Authority (Multisig):", multisigPDA.toBase58());

    if (finalAuthority.toBase58() === multisigPDA.toBase58()) {
      console.log("\n✅ SUCCESS: Program ownership has been transferred to the multisig!");
    } else {
      console.log("\n❌ ERROR: Program ownership transfer failed!");
      console.log("Current owner is still:", finalAuthority.toBase58());
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();

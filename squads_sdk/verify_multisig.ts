import * as multisig from "@sqds/multisig";
import { Keypair } from "@solana/web3.js";
import * as fs from 'fs';

async function main() {
  try {
    // Load create key
    const createKey = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync('wallets/create_key.json', 'utf-8')))
    );

    // Derive the multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
    });

    // Read the saved multisig address
    const savedMultisigAddress = fs.readFileSync('.multisig_address', 'utf-8').trim();

    console.log("\nVerifying multisig address:");
    console.log("Create key:", createKey.publicKey.toBase58());
    console.log("Derived address:", multisigPda.toBase58());
    console.log("Saved address:", savedMultisigAddress);
    
    if (multisigPda.toBase58() === savedMultisigAddress) {
      console.log("\n✅ Multisig address verified successfully!");
    } else {
      console.log("\n❌ Warning: Multisig addresses don't match!");
    }

  } catch (error) {
    console.error("Error verifying multisig:", error);
  }
}

main(); 
import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';

const { Permission, Permissions } = multisig.types;

// Use local validator connection
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// Helper to get wallet path in parent directory
const getWalletPath = (filename: string) => path.join('..', 'wallets', filename);

async function main() {
  try {
    // Load member wallets and create key
    const member1 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('member1.json'), 'utf-8')))
    );
    const member2 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('member2.json'), 'utf-8')))
    );
    const member3 = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('member3.json'), 'utf-8')))
    );
    const createKey = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(getWalletPath('create_key.json'), 'utf-8')))
    );

    // Derive the multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
    });

    console.log("Creating multisig with PDA:", multisigPda.toBase58());
    console.log("\nMembers:");
    console.log("1:", member1.publicKey.toBase58(), "(All permissions)");
    console.log("2:", member2.publicKey.toBase58(), "(All permissions)");
    console.log("3:", member3.publicKey.toBase58(), "(All permissions)");
    console.log("Threshold: 2");

    // Get program config for treasury
    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      programConfigPda
    );

    // Create the multisig
    const signature = await multisig.rpc.multisigCreateV2({
      connection,
      createKey,
      creator: member1, // Using member1 as creator
      multisigPda,
      configAuthority: null,
      timeLock: 0,
      members: [
        {
          key: member1.publicKey,
          permissions: Permissions.all(),
        },
        {
          key: member2.publicKey,
          permissions: Permissions.all(),
        },
        {
          key: member3.publicKey,
          permissions: Permissions.all(),
        },
      ],
      threshold: 2,
      rentCollector: null,
      treasury: programConfig.treasury,
      sendOptions: { skipPreflight: true },
    });

    await connection.confirmTransaction(signature);
    console.log("\n✅ Multisig created successfully!");
    console.log("Transaction signature:", signature);
    console.log("Multisig address:", multisigPda.toBase58());

    // Save multisig address in parent directory
    fs.writeFileSync(path.join('..', '.multisig_address'), multisigPda.toBase58());

  } catch (error) {
    console.error("Error creating multisig:", error);
  }
}

main();
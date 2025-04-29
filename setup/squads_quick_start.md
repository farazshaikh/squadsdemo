// DOCS COPIED VERBATIM INTO PROJECT FOR CURSOR AI TO READ AND LEARN !!
// DOCS COPIED VERBATIM INTO PROJECT FOR CURSOR AI TO READ AND LEARN !!

    Introduction

Quickstart

A 10 minute overview on how to interact with Squads Protocol using Typescript.
Set up your workspace (1 minute)

Important note: You can find the code for this quickstart guide here.

Let's set up a new Typescript project. 
First, create a new directory.

mkdir squads_quickstart

cd squads_quickstart

Now, create a new file named tsconfig.json

{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es6",
    "esModuleInterop": true
  }
}

Add a package.json file and add this content

{
  "scripts": {
    "test": "npx mocha -r ts-node/register 'main.ts' --timeout 10000"
  },
  "dependencies": {
    "@solana/web3.js": "^1.73.0",
    "@sqds/multisig": "^2.1.3"
  },
  "devDependencies": {
    "@types/chai": "^4.3.3",
    "@types/mocha": "^10.0.6",
    "chai": "^4.3.6",
    "mocha": "^10.3.0",
    "ts-mocha": "^10.0.0",
    "typescript": "^4.8.3"
  }
}

Here, the main takeaway is that we are going to use the @sqds/multisig package.

Last but not least, create a main.ts file at the same location, and add this code:

import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  clusterApiUrl,
} from "@solana/web3.js";

const { Permission, Permissions } = multisig.types;

// Use 'https://api.devnet.solana.com' if there are struggles running locally
const connection = new Connection("http://localhost:8899", "confirmed");

Let's get to the code (8 minutes)
Create a multisig (2 minutes)

Let's set up a testing flow in which we're going to create a multisig, propose a new transaction, vote on that transaction and execute it.

First, let's add our first step: Setting up the multisig members and creating the multisig.

describe("Interacting with the Squads V4 SDK", () => {
  const creator = Keypair.generate();
  const secondMember = Keypair.generate();
  before(async () => {
    const airdropSignature = await connection.requestAirdrop(
      creator.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
  });

  const createKey = Keypair.generate();

  // Derive the multisig account PDA
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  it("Create a new multisig", async () => {
    const programConfigPda = multisig.getProgramConfigPda({})[0];

    console.log("Program Config PDA: ", programConfigPda.toBase58());

    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        connection,
        programConfigPda
      );

    const configTreasury = programConfig.treasury;

    // Create the multisig
    const signature = await multisig.rpc.multisigCreateV2({
      connection,
      // One time random Key
      createKey,
      // The creator & fee payer
      creator,
      multisigPda,
      configAuthority: null,
      timeLock: 0,
      members: [
        {
          key: creator.publicKey,
          permissions: Permissions.all(),
        },
        {
          key: secondMember.publicKey,
          // This permission means that the user will only be able to vote on transactions
          permissions: Permissions.fromPermissions([Permission.Vote]),
        },
      ],
      // This means that there needs to be 2 votes for a transaction proposal to be approved
      threshold: 2,
      rentCollector: null,
      treasury: configTreasury,
      sendOptions: { skipPreflight: true },
    });
    await connection.confirmTransaction(signature);
    console.log("Multisig created: ", signature);
  });

Create transaction proposal (2 minutes)

Now, let's create a transaction proposal. We want the multisig to send 0.1 SOL to the creator.
For purposes of this tutorial, we first have to send that amount to the multisig, and can then create a message containing the instruction that needs to be executed.

  it("Create a transaction proposal", async () => {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });
    const instruction = SystemProgram.transfer({
      // The transfer is being signed from the Squads Vault, that is why we use the VaultPda
      fromPubkey: vaultPda,
      toPubkey: creator.publicKey,
      lamports: 1 * LAMPORTS_PER_SOL,
    });
    // This message contains the instructions that the transaction is going to execute
    const transferMessage = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [instruction],
    });

    // Get the current multisig transaction index
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );

    const currentTransactionIndex = Number(multisigInfo.transactionIndex);

    const newTransactionIndex = BigInt(currentTransactionIndex + 1);

    const signature1 = await multisig.rpc.vaultTransactionCreate({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: newTransactionIndex,
      creator: creator.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: transferMessage,
      memo: "Transfer 0.1 SOL to creator",
    });

    await connection.confirmTransaction(signature1);

    console.log("Transaction created: ", signature1);

    const signature2 = await multisig.rpc.proposalCreate({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: newTransactionIndex,
      creator,
    });

    await connection.confirmTransaction(signature2);

    console.log("Transaction proposal created: ", signature2);
  });

Vote on the transaction proposal (2 minutes)

Let's now vote on the transaction proposal we just made using the two Keypairs we created at the start of this tutorial: creator and secondMember.

  it("Vote on the created proposal", async () => {
    const transactionIndex =
      await multisig.accounts.Multisig.fromAccountAddress(
        connection,
        multisigPda
      ).then((info) => Number(info.transactionIndex));

    const signature1 = await multisig.rpc.proposalApprove({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: BigInt(transactionIndex),
      member: creator,
    });

    await connection.confirmTransaction(signature1);

    const signature2 = await multisig.rpc.proposalApprove({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: BigInt(transactionIndex),
      member: secondMember,
    });

    await connection.confirmTransaction(signature2);
  });

Execute the transaction (2 minutes)

Now the most important part, actually executing that transaction we proposed.

  it("Execute the proposal", async () => {
    const transactionIndex =
      await multisig.accounts.Multisig.fromAccountAddress(
        connection,
        multisigPda
      ).then((info) => Number(info.transactionIndex));

    const [proposalPda] = multisig.getProposalPda({
      multisigPda,
      transactionIndex: BigInt(transactionIndex),
    });
    const signature = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex: BigInt(transactionIndex),
      member: creator.publicKey,
      signers: [creator],
      sendOptions: { skipPreflight: true },
    });

    await connection.confirmTransaction(signature);
    console.log("Transaction executed: ", signature);
  });

// Don't forget to close the describe block here
});

Start a local validator (1 minute)

Now that you have a completed flow, let's actually execute these transactions on chain.
For the purpose of this tutorial, we are going to do so on a local Solana instance.

If you do not yet have the Solana CLI installed, please do so by reading the following guide.

Now, start up a local validator with the Squads V4 program preloaded.

Note: You will also have to clone the program config account from mainnet.

solana-test-validator --url m --clone-upgradeable-program SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf -c BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr -c Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n

 Set Your Environment to Devnet (Optional, 1 minute)

If you run into issues creating a local validator and cloning the necessary accounts, you can optionally use Solana's devnet cluster. This is a useful alternative because all needed accounts will already be available.

To switch to devnet, edit the connection variable you defined earlier in the guide:

const connection = new Connection("http://localhost:8899", "confirmed");

When using devnet, you may run into rate limit issues when attempting to request an airdrop. To circumvent this, we can use the keypair from our Solana CLI, and manually fund any keypairs we create. To do this, we can refactor the beginning of our script to accomplish this:

// Add these two dependencies
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Add this before you define `describe`
const keyFileContents = JSON.parse(
  readFileSync(path.join(process.env.HOME, ".config/solana/id.json")).toString()
);

const creator = Keypair.fromSecretKey(new Uint8Array(keyFileContents));
const secondMember = Keypair.generate();

and then add this snippet at the beginning of your first test:

try {
    // Attempt an airdrop
    await connection.requestAirdrop(
      secondMember.publicKey,
      1 * LAMPORTS_PER_SOL
    );
} catch (e) {
    // If it fails due to rate limits, send from the filesystem keypair
    console.log("airdrop failed");

    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: creator.publicKey,
        recentBlockhash: await (
          await connection.getLatestBlockhash()
        ).blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: creator.publicKey,
            toPubkey: secondMember.publicKey,
            lamports: 1_000_000,
          }),
        ],
      }).compileToV0Message()
    );

    tx.sign([creator]);

    console.log("✨ Sending SOL...");
    await connection.sendTransaction(tx);
    console.log("✅ SOL sent.");
}

Execute the script

Okay, let's execute the script and see what happens.

yarn test

If you are encountering any issues here, try using another version of Node.js (above 20.xx). Additionally, switching SDK versions (to 2.1.1 or 2.1.0) may alleviate any ESM resoultion issues.

If you get a "fetch failed" error, make sure your local validator is running.
Visualize your transactions

Once the tests have passed, you can go to the Solana Explorer and visualize your transactions by pasting their signature in the search bar and modifying the cluster endpoint to the one you want (mainnet, devnet, localnet...).
What can I do from here?
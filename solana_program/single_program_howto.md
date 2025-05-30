Rust is the most common programming language to write Solana programs with. This quickstart guide will demonstrate how to quickly setup, build, and deploy your first Rust based Solana program to the blockchain.

Do you have the Solana CLI installed?

This guide uses the Solana CLI and assumes you have setup your local development environment. Checkout our local development quickstart guide here to quickly get setup.
What you will learn

    how to install the Rust language locally
    how to initialize a new Solana Rust program
    how to code a basic Solana program in Rust
    how to build and deploy your Rust program

Install Rust and Cargo

To be able to compile Rust based Solana programs, install the Rust language and Cargo (the Rust package manager) using Rustup:

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

Run your localhost validator

The Solana CLI comes with the test validator built in. This command line tool will allow you to run a full blockchain cluster on your machine.

solana-test-validator

PRO TIP

Run the Solana test validator in a new/separate terminal window that will remain open. This command line program must remain running for your localhost validator to remain online and ready for action.

Configure your Solana CLI to use your localhost validator for all your future terminal commands and Solana program deployment:

solana config set --url localhost

Create a new Rust library with Cargo

Solana programs written in Rust are libraries which are compiled to BPF bytecode and saved in the .so format.

Initialize a new Rust library named hello_world via the Cargo command line:

cargo init hello_world --lib
cd hello_world

Add the solana-program crate to your new Rust library:

cargo add solana-program

Pro Tip

It is highly recommended to keep your solana-program and other Solana Rust dependencies in-line with your installed version of the Solana CLI. For example, if you are running Solana CLI 2.0.3, you can instead run:

cargo add solana-program@"=2.0.3"

This will ensure your crate uses only 2.0.3 and nothing else. If you experience compatibility issues with Solana dependencies, check out the Solana Stack Exchange

Open your Cargo.toml file and add these required Rust library configuration settings, updating your project name as appropriate:

[lib]
name = "hello_world"
crate-type = ["cdylib", "lib"]

Create your first Solana program

The code for your Rust based Solana program will live in your src/lib.rs file. Inside src/lib.rs you will be able to import your Rust crates and define your logic. Open your src/lib.rs file in your favorite editor.

At the top of lib.rs, import the solana-program crate and bring our needed items into the local namespace:

use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};

Every Solana program must define an entrypoint that tells the Solana runtime where to start executing your onchain code. Your program's entrypoint should provide a public function named process_instruction:

// declare and export the program's entrypoint
entrypoint!(process_instruction);

// program entrypoint's implementation
pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    // log a message to the blockchain
    msg!("Hello, world!");

    // gracefully exit the program
    Ok(())
}

Every onchain program should return the Ok result enum with a value of (). This tells the Solana runtime that your program executed successfully without errors.

This program above will simply log a message of "Hello, world!" to the blockchain cluster, then gracefully exit with Ok(()).
Build your Rust program

Inside a terminal window, you can build your Solana Rust program by running in the root of your project (i.e. the directory with your Cargo.toml file):

cargo build-sbf

    After each time you build your Solana program, the above command will output the build path of your compiled program's .so file and the default keyfile that will be used for the program's address. cargo build-sbf installs the toolchain from the currently installed solana CLI tools. You may need to upgrade those tools if you encounter any version incompatibilities. In case you get an error like: error while loading shared libraries: librustc_driver-278a6e01e221f788.soyou may need to go to ~/.cache/solana/ and rm -rf the platform tools there and then run cargo build-sbf again.

Deploy your Solana program

Using the Solana CLI, you can deploy your program to your currently selected cluster:

solana program deploy ./target/deploy/hello_world.so

Once your Solana program has been deployed (and the transaction finalized), the above command will output your program's public address (aka its "program id").

# example output
Program Id: EFH95fWg49vkFNbAdw9vy75tM7sWZ2hQbTTUmuACGip3

Congratulations!

You have successfully setup, built, and deployed a Solana program using the Rust language.

Look at your program!

You can use the Solana Explorer to look at your newly deployed program. The explorer also works on localnet, you can open the Solana Explorer on localnet and just paste your programId in the search bar.
Let's call the Hello World program

Now that the program is deployed we want to call it to see the actual "Hello World" on chain. For that we will use Javascript and the Solana web3.js library.
Install Node.js

To use node in WSL2 on Windows, please follow this
guide to installing node in WSL2 to install node.

sudo apt-get install curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

reopen the terminal

nvm install --lts
node --version

For macOS you can install node.js via package manager
Create the client file

Install the Solana web3.js library and the Solana helpers library:

npm install @solana/web3.js@1 @solana-developers/helpers@2

Create a new file called client.mjs and add the following code:

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

const programId = new PublicKey("YOUR_PROGRAM_ID");

// Connect to a solana cluster. Either to your local test validator or to devnet
const connection = new Connection("http://localhost:8899", "confirmed");
//const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// We load the keypair that we created in a previous step
const keyPair = await getKeypairFromFile("~/.config/solana/id.json");

// Every transaction requires a blockhash
const blockhashInfo = await connection.getLatestBlockhash();

// Create a new transaction
const tx = new Transaction({
  ...blockhashInfo,
});

// Add our Hello World instruction
tx.add(
  new TransactionInstruction({
    programId: programId,
    keys: [],
    data: Buffer.from([]),
  }),
);

// Sign the transaction with your previously created keypair
tx.sign(keyPair);

// Send the transaction to the Solana network
const txHash = await connection.sendRawTransaction(tx.serialize());

console.log("Transaction sent with hash:", txHash);

await connection.confirmTransaction({
  blockhash: blockhashInfo.blockhash,
  lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
  signature: txHash,
});

console.log(
  `Congratulations! Look at your ‘Hello World' transaction in the Solana Explorer:
  https://explorer.solana.com/tx/${txHash}?cluster=custom`,
);

    Don't forget to replace YOUR_PROGRAM_ID with the program ID you got from the deployment step.

Run the client

Now lets use node run this file to see the "Hello World" on chain.

node client.mjs

You should see the following output:

Congratulations! Look at your ‘Hello World' transaction in the Solana Explorer:
  https://explorer.solana.com/tx/2fTcQ74z4DVi8WRuf2oNZ36z7k9tGRThaRPXBMYgjMUNUbUSKLrP6djpRUZ8msuTXvZHFe3UXi31dfgytG2aJZbv?cluster=custom

Congrats

If you follow the link you should be able to see your 'Hello World' transaction on the Solana explorer.
Deploy to Solana devnet

Now you have successfully deployed your program to your local cluster. If you want to deploy it to the public devnet to show your program to your friends you can do so by running the following command:

solana program deploy ./target/deploy/hello_world.so --url https://api.devnet.solana.com

Then change the connections url in your client.mjs also to https://api.devnet.solana.com and run the client again.

node client.mjs

You should see the same output as before but now on the public devnet cluster. You can see the transaction in the Solana Explorer again. Now you just need to switch it to devnet on the top right.

Congratulations, now everyone in the world can see your "Hello World" transaction on the Solana blockchain.
Next steps
See the links below to learn more about writing Rust based Solana programs:
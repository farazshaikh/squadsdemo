import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

// The program ID for Squads v4
const SQUADS_PROGRAM_ID = new PublicKey('SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf');

async function deriveMultisigAddress() {
    // Read the createKey
    const createKeyPath = '.multisig_create_key';
    if (!fs.existsSync(createKeyPath)) {
        console.log('Error: No createKey found in .multisig_create_key');
        console.log('Please run create_multisig first');
        return;
    }
    const createKey = new PublicKey(fs.readFileSync(createKeyPath, 'utf-8').trim());
    
    // Derive the multisig PDA using the correct seeds
    const [multisigPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("multisig"),
            Buffer.from("multisig"),
            createKey.toBuffer()
        ],
        SQUADS_PROGRAM_ID
    );
    
    // Read the actual multisig address if it exists
    const multisigAddressPath = '.multisig_address';
    if (fs.existsSync(multisigAddressPath)) {
        const actualAddress = fs.readFileSync(multisigAddressPath, 'utf-8').trim();
        console.log('Actual multisig address:   ', actualAddress);
        console.log('Derived multisig address:  ', multisigPda.toBase58());
        
        if (actualAddress === multisigPda.toBase58()) {
            console.log('✓ Addresses match!');
        } else {
            console.log('✗ Addresses do not match!');
        }
    } else {
        console.log('Derived multisig address: ', multisigPda.toBase58());
        console.log('Note: No existing multisig address found in .multisig_address');
    }
}

deriveMultisigAddress().catch(console.error); 
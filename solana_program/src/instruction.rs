use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_program,
};

#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum CounterInstruction {
    /// Initialize a new counter
    ///
    /// Accounts expected:
    /// 0. `[writable]` The counter account to initialize
    /// 1. `[signer]` The authority who will be able to increment the counter
    /// 2. `[]` The system program
    Initialize,

    /// Increment the counter
    ///
    /// Accounts expected:
    /// 0. `[writable]` The counter account
    /// 1. `[signer]` The authority allowed to increment the counter
    Increment,
}

pub fn initialize(
    program_id: &Pubkey,
    counter: &Pubkey,
    authority: &Pubkey,
) -> Result<Instruction, std::io::Error> {
    let data = CounterInstruction::Initialize.try_to_vec()?;
    let accounts = vec![
        AccountMeta::new(*counter, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

pub fn increment(
    program_id: &Pubkey,
    counter: &Pubkey,
    authority: &Pubkey,
) -> Result<Instruction, std::io::Error> {
    let data = CounterInstruction::Increment.try_to_vec()?;
    let accounts = vec![
        AccountMeta::new(*counter, false),
        AccountMeta::new_readonly(*authority, true),
    ];

    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}

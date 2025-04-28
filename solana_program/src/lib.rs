#![feature(build_hasher_simple_hash_one)]

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Counter {
    pub count: u32,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    let mut counter = Counter::try_from_slice(&account.data.borrow())?;
    counter.count += 1;
    counter.serialize(&mut *account.data.borrow_mut())?;

    msg!("Counter incremented to {}", counter.count);
    Ok(())
}

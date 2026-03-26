module data_vault::vault {
    use std::string::{Self, String};
    use one::event;

    /// Owned vault entry — stores a data reference/hash
    public struct VaultEntry has key, store {
        id: object::UID,
        owner: address,
        label: String,
        data_hash: String,
        encrypted_ref: String,
        created_epoch: u64,
    }

    public struct EntryStored has copy, drop {
        owner: address,
        label: String,
        epoch: u64,
    }

    const E_EMPTY_HASH: u64 = 0;

    public fun store(
        raw_label: vector<u8>,
        raw_hash: vector<u8>,
        raw_ref: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let data_hash = string::utf8(raw_hash);
        assert!(string::length(&data_hash) > 0, E_EMPTY_HASH);
        let label = string::utf8(raw_label);
        let epoch = ctx.epoch();
        let sender = ctx.sender();

        event::emit(EntryStored { owner: sender, label, epoch });

        transfer::transfer(VaultEntry {
            id: object::new(ctx),
            owner: sender,
            label,
            data_hash,
            encrypted_ref: string::utf8(raw_ref),
            created_epoch: epoch,
        }, sender);
    }

    public fun delete_entry(entry: VaultEntry, ctx: &TxContext) {
        assert!(entry.owner == ctx.sender(), 0);
        let VaultEntry { id, owner: _, label: _, data_hash: _, encrypted_ref: _, created_epoch: _ } = entry;
        object::delete(id);
    }

    public fun label(e: &VaultEntry): &String { &e.label }
    public fun data_hash(e: &VaultEntry): &String { &e.data_hash }
    public fun owner(e: &VaultEntry): address { e.owner }
}

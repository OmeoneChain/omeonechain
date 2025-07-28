module omeone::token {
    use std::string::String;
    use std::option;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin, TreasuryCap};

    /// The one-time witness type - MUST match module name in uppercase
    public struct TOKEN has drop {}

    /// Token registry for tracking supply and metrics
    public struct TokenRegistry has key {
        id: UID,
        total_supply: u64,
        distributed_supply: u64,
        current_emission_rate: u64,
        halving_count: u8,
        created_at: u64,
    }

    /// Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 302;
    const E_INVALID_AMOUNT: u64 = 304;

    /// Constants
    const TOTAL_SUPPLY: u64 = 10_000_000_000_000_000_000; // 10 billion tokens with 9 decimals
    const INITIAL_EMISSION_RATE: u64 = 1_000_000_000_000_000; // 1M tokens per day initially
    const HALVING_THRESHOLD_1: u64 = 1_000_000_000_000_000_000; // 1 billion tokens (10% of total)

    /// Initialize the token - witness type TOKEN matches module name
    fun init(witness: TOKEN, ctx: &mut TxContext) {
        // Create the currency with TOKEN witness type
        let (treasury_cap, metadata) = coin::create_currency<TOKEN>(
            witness,
            9, // decimals
            b"OMEONE",
            b"OmeoneChain Token",
            b"The native token of the OmeoneChain recommendation network",
            option::none(),
            ctx
        );

        // Create token registry
        let registry = TokenRegistry {
            id: object::new(ctx),
            total_supply: TOTAL_SUPPLY,
            distributed_supply: 0,
            current_emission_rate: INITIAL_EMISSION_RATE,
            halving_count: 0,
            created_at: 0, // Would use clock in production
        };

        // Transfer the treasury cap and registry
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_freeze_object(metadata);
        transfer::share_object(registry);
    }

    /// Mint tokens (only treasury cap owner can call)
    public fun mint(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        assert!(amount > 0, E_INVALID_AMOUNT);
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Burn tokens
    public fun burn(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        coin: Coin<TOKEN>
    ): u64 {
        coin::burn(treasury_cap, coin)
    }

    /// Transfer tokens
    public fun transfer_tokens(
        coin: Coin<TOKEN>,
        recipient: address,
        _description: String,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(coin, recipient);
    }

    /// Split coin
    public fun split_coin(
        coin: &mut Coin<TOKEN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        assert!(coin::value(coin) >= amount, E_INSUFFICIENT_BALANCE);
        coin::split(coin, amount, ctx)
    }

    /// Join coins
    public fun join_coins(
        coin1: &mut Coin<TOKEN>,
        coin2: Coin<TOKEN>
    ) {
        coin::join(coin1, coin2);
    }

    /// Get token balance
    public fun get_balance(coin: &Coin<TOKEN>): u64 {
        coin::value(coin)
    }

    /// Get registry info
    public fun get_registry_info(registry: &TokenRegistry): (u64, u64, u64, u8) {
        (
            registry.total_supply,
            registry.distributed_supply,
            registry.current_emission_rate,
            registry.halving_count
        )
    }

    /// Update registry (admin function)
    public fun update_registry(
        registry: &mut TokenRegistry,
        distributed_amount: u64,
        _ctx: &mut TxContext
    ) {
        registry.distributed_supply = registry.distributed_supply + distributed_amount;
        
        // Check for halving
        if (registry.distributed_supply >= HALVING_THRESHOLD_1 && registry.halving_count == 0) {
            registry.current_emission_rate = registry.current_emission_rate / 2;
            registry.halving_count = 1;
        };
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(TOKEN {}, ctx);
    }
}
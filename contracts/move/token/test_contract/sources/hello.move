module hello::world {
    use std::string;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct Hello has key {
        id: UID,
        message: string::String,
    }

    public fun create_hello(ctx: &mut TxContext) {
        let hello = Hello {
            id: object::new(ctx),
            message: string::utf8(b"Hello, IOTA Rebased!"),
        };
        transfer::share_object(hello);
    }
}

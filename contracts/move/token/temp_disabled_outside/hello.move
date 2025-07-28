module omeone::hello {
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;

    /// A simple object to test deployment
    public struct Hello has key, store {
        id: UID,
        message: vector<u8>,
    }

    /// Create a hello object
    public fun create_hello(message: vector<u8>, ctx: &mut TxContext): Hello {
        Hello {
            id: object::new(ctx),
            message,
        }
    }

    /// Public entry function to create and transfer a hello object
    public entry fun say_hello(message: vector<u8>, ctx: &mut TxContext) {
        let hello = create_hello(message, ctx);
        transfer::transfer(hello, tx_context::sender(ctx));
    }

    /// Get the message from a hello object
    public fun get_message(hello: &Hello): &vector<u8> {
        &hello.message
    }
}
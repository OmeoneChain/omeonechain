/**
 * Chain-related types for OmeoneChain
 * These types define the interface between the core business logic and blockchain adapters
 */
/**
 * Chain adapter types
 */
export var AdapterType;
(function (AdapterType) {
    AdapterType["REBASED"] = "rebased";
    AdapterType["EVM"] = "evm";
})(AdapterType || (AdapterType = {}));

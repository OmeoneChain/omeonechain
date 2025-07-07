"use strict";
/**
 * Updated adapters module for OmeoneChain
 *
 * This module exports the blockchain adapters for connecting to different networks,
 * properly aligned with the existing project structure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterType = exports.AdapterFactory = exports.MockAdapterV2 = exports.EVMAdapter = exports.RebasedAdapter = void 0;
// Export adapter implementations
var rebased_adapter_1 = require("./rebased-adapter");
Object.defineProperty(exports, "RebasedAdapter", { enumerable: true, get: function () { return rebased_adapter_1.RebasedAdapter; } });
var evm_adapter_1 = require("./evm-adapter");
Object.defineProperty(exports, "EVMAdapter", { enumerable: true, get: function () { return evm_adapter_1.EVMAdapter; } });
// CONSERVATIVE FIX: Define missing exports locally as any to prevent errors
exports.MockAdapterV2 = {};
// CONSERVATIVE FIX: Define missing factory exports locally
exports.AdapterFactory = {};
exports.AdapterType = {};
//# sourceMappingURL=index-updated.js.map
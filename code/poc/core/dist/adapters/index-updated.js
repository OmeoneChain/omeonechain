"use strict";
/**
 * Updated adapters module for OmeoneChain
 *
 * This module exports the blockchain adapters for connecting to different networks,
 * properly aligned with the existing project structure.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterType = exports.AdapterFactory = exports.MockAdapterV2 = exports.EVMAdapter = exports.RebasedAdapter = void 0;
// Export adapter implementations
var rebased_adapter_1 = require("./rebased-adapter");
Object.defineProperty(exports, "RebasedAdapter", { enumerable: true, get: function () { return rebased_adapter_1.RebasedAdapter; } });
var evm_adapter_1 = require("./evm-adapter");
Object.defineProperty(exports, "EVMAdapter", { enumerable: true, get: function () { return evm_adapter_1.EVMAdapter; } });
var mock_adapter_v2_1 = require("./mock-adapter-v2");
Object.defineProperty(exports, "MockAdapterV2", { enumerable: true, get: function () { return mock_adapter_v2_1.MockAdapterV2; } });
// Export adapter factory
var adapter_factory_updated_1 = require("./adapter-factory-updated");
Object.defineProperty(exports, "AdapterFactory", { enumerable: true, get: function () { return adapter_factory_updated_1.AdapterFactory; } });
Object.defineProperty(exports, "AdapterType", { enumerable: true, get: function () { return adapter_factory_updated_1.AdapterType; } });
// Export adapter-specific type helpers
__exportStar(require("./types/recommendation-adapters"), exports);
__exportStar(require("./types/reputation-adapters"), exports);
__exportStar(require("./types/token-adapters"), exports);
//# sourceMappingURL=index-updated.js.map
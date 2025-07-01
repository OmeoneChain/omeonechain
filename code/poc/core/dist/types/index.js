"use strict";
// Comprehensive type exports to fix import issues
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
exports.OmeoneError = exports.IPFSStorage = exports.BaseChainAdapter = void 0;
// Chain types
__exportStar(require("./chain"), exports);
__exportStar(require("./recommendation"), exports);
__exportStar(require("./reputation"), exports);
__exportStar(require("./service"), exports);
__exportStar(require("./token"), exports);
// Adapter types
var chain_adapter_1 = require("../adapters/chain-adapter");
Object.defineProperty(exports, "BaseChainAdapter", { enumerable: true, get: function () { return chain_adapter_1.BaseChainAdapter; } });
// Storage types
var ipfs_storage_1 = require("../storage/ipfs-storage");
Object.defineProperty(exports, "IPFSStorage", { enumerable: true, get: function () { return ipfs_storage_1.IPFSStorage; } });
// Error types
class OmeoneError extends Error {
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.name = 'OmeoneError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.OmeoneError = OmeoneError;
//# sourceMappingURL=index.js.map
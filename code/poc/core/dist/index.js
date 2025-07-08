"use strict";
/**
 * OmeoneChain Core Package
 *
 * Main entry point for the OmeoneChain core functionality
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
// Export types (remove duplicate TangleReference exports)
__exportStar(require("./type/reputation"), exports);
__exportStar(require("./type/token"), exports);
__exportStar(require("./type/service"), exports);
// Export adapters (remove non-existent mock-adapter)
__exportStar(require("./adapters/chain-adapter"), exports);
// Export storage
__exportStar(require("./storage/storage-provider"), exports);
__exportStar(require("./storage/ipfs-storage"), exports);
// Export engines
__exportStar(require("./recommendation/engine"), exports);
// Export from other modules as they are implemented
// export * from './reputation/engine';
// export * from './token/engine';
// export * from './governance/engine';
//# sourceMappingURL=index.js.map
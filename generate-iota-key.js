const crypto = require('crypto');

function generateIOTAKeypair() {
    // Generate a 32-byte private key (standard for most blockchains)
    const privateKey = crypto.randomBytes(32);
    const privateKeyHex = '0x' + privateKey.toString('hex');
    
    // Generate a deterministic address from the private key
    // This is a simplified version - real IOTA uses Ed25519 keys
    const hash1 = crypto.createHash('sha256').update(privateKey).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    const address = '0x' + hash2.toString('hex').substring(0, 40);
    
    return {
        privateKey: privateKeyHex,
        address: address
    };
}

console.log('🔑 Generating IOTA Testnet Development Keypair...\n');

const keypair = generateIOTAKeypair();

console.log('Generated keypair:');
console.log('Private key:', keypair.privateKey);
console.log('Address:', keypair.address);
console.log('');
console.log('Environment setup:');
console.log(`export IOTA_PRIVATE_KEY="${keypair.privateKey}"`);
console.log(`export IOTA_ADDRESS="${keypair.address}"`);
console.log('');
console.log('✅ Save these values - you\'ll need them for deployment!');

// Also save to a file for easy reference
const fs = require('fs');
const envContent = `# IOTA Testnet Development Keys
# Generated: ${new Date().toISOString()}
IOTA_PRIVATE_KEY=${keypair.privateKey}
IOTA_ADDRESS=${keypair.address}
IOTA_NETWORK=testnet
`;

fs.writeFileSync('.env.iota-testnet', envContent);
console.log('�� Saved to .env.iota-testnet file');

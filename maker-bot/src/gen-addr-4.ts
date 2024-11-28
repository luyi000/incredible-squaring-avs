import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

const network = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'tb', // Testnet4 uses 'tb' for Bech32 addresses
    bip32: {
        public: 0x043587cf,
        private: 0x04358394,
    },
    pubKeyHash: 0x6f, // Testnet4 P2PKH prefix
    scriptHash: 0x3f, // Testnet4 P2SH prefix
    wif: 0xef, // Testnet4 WIF prefix
};

function toXOnly(publicKey) {
    // Ensure the public key is in Buffer format
    const pubKeyBuffer = Buffer.isBuffer(publicKey) ? publicKey : Buffer.from(publicKey, 'hex');

    // Check if the public key is valid (compressed or uncompressed)
    if (pubKeyBuffer.length !== 33 && pubKeyBuffer.length !== 65) {
        throw new Error('Invalid public key length');
    }

    // Extract the x-only part
    // Skip the first byte (0x02 or 0x03 for compressed keys)
    // Return the x-only public key as a Buffer
    return pubKeyBuffer.slice(1, 33);
}

// Function to generate address
function generateAddress(wif: string) {
    const keyPair = ECPair.fromWIF(wif, network);
    // Generate P2PKH address
    const { address: p2pkhAddress } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

    // Generate P2SH address (using P2WPKH wrapped in P2SH)
    const { address: p2shAddress } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet }),
        network: bitcoin.networks.testnet,
    });

    // Generate P2WPKH address
    const { address: p2wpkhAddress } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

    // Generate P2TR address
    const {address : p2trAddress} = bitcoin.payments.p2tr({ internalPubkey: toXOnly(keyPair.publicKey), network: bitcoin.networks.testnet});
    return { p2pkhAddress, p2shAddress, p2wpkhAddress, p2trAddress };
}

// Example usage
const wif = 'cR4id5io8gLdDSZpcUz9P1kXUpPiTKtvbS6aJuSuMNYzcVGmmsf4'; // Update to a Testnet4 WIF
const address = generateAddress(wif);
console.log('Generated Address:', address);

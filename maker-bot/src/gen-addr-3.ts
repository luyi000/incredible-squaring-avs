import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

function generateAddressesFromWIF(wif: string) {
    // Decode the WIF private key
    const keyPair = ECPair.fromWIF(wif, bitcoin.networks.testnet);

    // Generate P2PKH address
    const { address: p2pkhAddress } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

    // Generate P2SH address (using P2WPKH wrapped in P2SH)
    const { address: p2shAddress } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet }),
        network: bitcoin.networks.testnet,
    });

    // Generate P2WPKH address
    const { address: p2wpkhAddress } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

    return {
        p2pkhAddress,
        p2shAddress,
        p2wpkhAddress,
    };
}

// Example usage
const wif = 'cR4id5io8gLdDSZpcUz9P1kXUpPiTKtvbS6aJuSuMNYzcVGmmsf4'; // Replace with your WIF private key
const addresses = generateAddressesFromWIF(wif);
console.log('Generated Addresses:', addresses);
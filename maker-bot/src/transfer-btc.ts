import * as bitcoin from 'bitcoinjs-lib';
import {Psbt} from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import axios from 'axios';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import {randomBytes} from "node:crypto";

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

// Define the network (testnet)
const network = bitcoin.networks.testnet;

// Replace these with your actual details
const privateKeyWIF = 'cR4id5io8gLdDSZpcUz9P1kXUpPiTKtvbS6aJuSuMNYzcVGmmsf4';
const recipientAddress = 'tb1pxwtyrthu5mhhsv74695d84vlj3aea4ktljk4mhuk4yeq04gv397qqye7tu';
const recipientPrivateKeyWIF = 'cRAUDbJBW6RKVhjGvKPBHVwZ8xZHCVorqRxd4CWga1Zm9Fn6xwu2';

const amountToSend = 100; // amount in satoshis

// Get the keypair from the private key
const keyPair = ECPair.fromWIF(privateKeyWIF, network);
// Since internalKey is an xOnly pubkey, we drop the DER header byte
const childNodeXOnlyPubkey = toXOnly(keyPair.publicKey);
// Used for signing, since the output and address are using a tweaked key
// We must tweak the signer in the same way.
const tweakedChildNode = keyPair.tweak(
    bitcoin.crypto.taggedHash('TapTweak', childNodeXOnlyPubkey),
);

// Get the address from the keypair
const {address, output} = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    network,
});
console.log({address});

if (!address) {
    throw new Error('Failed to generate address');
}

// const recipientKeypair = ECPair.fromWIF(recipientPrivateKeyWIF, network);
// const sendInternalKey = toXOnly(recipientKeypair.publicKey);
// const sendPubKey = toXOnly(sendInternalKey);
// const { address: sendAddress } = bitcoin.payments.p2tr({
//     internalPubkey: sendPubKey,
//     network,
// });
//
const bip32 = BIP32Factory(ecc);
const rng = (size: number) => randomBytes(size);
const sendInternalKey = bip32.fromSeed(rng(64), network);
const sendPubKey = toXOnly(sendInternalKey.publicKey);
const {address: sendAddress} = bitcoin.payments.p2tr({
    internalPubkey: sendPubKey,
    network,
});

console.log({sendAddress});


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

// Function to fetch UTXOs for the address
async function getUTXOs(address: string) {
    const url = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?unspentOnly=true`;
    const response = await axios.get(url);
    return response.data.txrefs || [];
}

async function createAndSignTransaction() {
    // Add input (UTXO details)
    const utxos = await getUTXOs(address!);
    if (utxos.length === 0) {
        throw new Error('No UTXOs available');
    }

    console.log({utxos});

    const utxo = utxos[0];
    const psbt = new Psbt({network}).addInput({
        hash: utxo.tx_hash, // Transaction ID of the UTXO
        index: utxo.tx_output_n, // Output index of the UTXO
        witnessUtxo: {
            script: output!,
            value: BigInt(utxo.value)
        },
        tapInternalKey: childNodeXOnlyPubkey
    }).addOutput({
        address: sendAddress,
        value: BigInt(amountToSend), // Amount in satoshis
        tapInternalKey: sendPubKey
    }).signInput(0, tweakedChildNode).finalizeAllInputs();

    // Extract the transaction
    const tx = psbt.extractTransaction(); // Returns the transaction in hex format
    // Broadcast the transaction
    const broadcastResponse = await broadcastTransaction(tx.toHex());
    console.log('Broadcast Response:', broadcastResponse);
    console.log('Tx Hash:', broadcastResponse.tx.hash);

    return broadcastResponse.tx.hash;
}

async function broadcastTransaction(transactionHex: string) {
    const url = 'https://api.blockcypher.com/v1/btc/test3/txs/push';
    const response = await axios.post(url, {tx: transactionHex});
    return response.data;
}

createAndSignTransaction().then(txHex => {
    console.log('Transaction Hex:', txHex);
}).catch(error => {
    console.error('Error:', error);
});
import * as bitcoin from 'bitcoinjs-lib';
import {Psbt} from 'bitcoinjs-lib';
import axios from "axios";
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import BIP32Factory from "bip32";
import {randomBytes} from "node:crypto";

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);
const network = bitcoin.networks.testnet;
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
    return pubKeyBuffer.slice(1, 33);
}

// Function to fetch UTXOs for the address
async function getUTXOs(address: string) {
    const url = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?unspentOnly=true`;
    const response = await axios.get(url);
    console.log(response.data);
    return response.data.txrefs || [];
}

async function sendBTCWithMemo(
    recipientAddress: string,
    amountInBTC: number,
    memo: string,
    privateKeyWIF: string
): Promise<string> {
    try {
        // Convert private key WIF to key pair
        // Get the keypair from the private key
        const keyPair = ECPair.fromWIF(privateKeyWIF, network);
        // Since internalKey is an xOnly pubkey, we drop the DER header byte
        const childNodeXOnlyPubkey = toXOnly(keyPair.publicKey);
        // Used for signing, since the output and address are using a tweaked key
        // We must tweak the signer in the same way.
        const tweakedChildNode = keyPair.tweak(
            bitcoin.crypto.taggedHash('TapTweak', childNodeXOnlyPubkey),
        );

        // Get testnet address from key pair using p2tr (taproot)
        const {address, output} = bitcoin.payments.p2tr({
            internalPubkey: childNodeXOnlyPubkey,
            network
        });
        console.log(address);

        // Get UTXOs (Unspent Transaction Outputs) from xtn API
        // UTXOs represent the available bitcoin balance that can be spent from this address
        // We need UTXOs to create a new transaction since Bitcoin uses the UTXO model
        // rather than an account balance model
        const utxos = await getUTXOs(address);
        console.log({utxos});

        if (utxos.length === 0) {
            throw new Error('No UTXOs available');
        }

        // Create transaction
        const psbt = new Psbt({network});

        // Add input
        const utxo = utxos[0];
        psbt.addInput({
            hash: utxo.tx_hash,
            index: utxo.tx_output_n,
            witnessUtxo: {
                script: output!,
                value: BigInt(utxo.value)
            },
            tapInternalKey: childNodeXOnlyPubkey
        });

        // Add output for recipient
        const satoshis = Math.floor(amountInBTC * 100000000);
        const memoBuffer = Buffer.from(memo, 'utf8');
        const embed = bitcoin.payments.embed({data: [memoBuffer]});
        psbt.addOutput({
            script: embed.output!,
            address: sendAddress,
            value: BigInt(satoshis),
            tapInternalKey: sendPubKey
        });

        // For taproot inputs, we need to sign with TapTweak
        psbt.signTaprootInput(0, tweakedChildNode);
        psbt.finalizeAllInputs();
        // Build and get raw transaction hex
        const tx = psbt.extractTransaction();
        const txHex = tx.toHex();

        // Broadcast transaction
        const broadcastResponse = await axios.post(
            'https://api.blockcypher.com/v1/btc/test3/txs/push',
            {tx: txHex}
        );

        console.log('Broadcast Response:', broadcastResponse.data);

        return broadcastResponse.data.tx.hash;
    } catch (error) {
        console.error('Error sending BTC:', error);
        throw error;
    }
}

// Example usage:
// const recipientAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';  // testnet address
// const amountInBTC = 0.001;
// const memo = 'Test transaction with memo';
// const privateKeyWIF = 'your_private_key_in_WIF_format';
// sendBTCWithMemo(recipientAddress, amountInBTC, memo, privateKeyWIF)
//   .then(txHash => console.log('Transaction hash:', txHash))
//   .catch(error => console.error('Error:', error));
// Main script execution
async function main(): Promise<void> {
    const recipientAddress = 'tb1p4kzqsdhgx7eejv8uqwhqg32e02qgekmz8p3sv83mufdanzg228mqkdxa0u';
    const amountInBTC = 0.0000001;
    const memo = ':ETH.ETH:0x2e4b14254ce56d195922cf1f4c7e97745ee90005';
    const privateKeyWIF = 'cR4id5io8gLdDSZpcUz9P1kXUpPiTKtvbS6aJuSuMNYzcVGmmsf4';

    sendBTCWithMemo(recipientAddress, amountInBTC, memo, privateKeyWIF)
        .then(txHash => {
            console.log('Transaction successfully sent!');
            console.log('Transaction hash:', txHash);
        })
        .catch(error => {
            console.error('Failed to send transaction:', error);
        });
}

main();
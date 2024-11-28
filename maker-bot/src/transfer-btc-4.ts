import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
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

type RecommendedFee = {
    fastestFee: number,
    halfHourFee: number,
    hourFee: number,
    economyFee: number,
    minimumFee: number,
}

async function getRecommendedFee() {
    return axios.get<RecommendedFee>('https://mempool.space/api/v1/fees/recommended').then(res => res.data);
}

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

async function broadcastTransaction(transactionHex: string) {
    const url = 'https://mempool.space/testnet4/api/tx';
    const response = await axios.post(url, transactionHex);
    return response.data;
}

async function transferBTC4(wif: string, toAddress: string, amountToSend: number, memo: string) {
    const feeRate = await getRecommendedFee().then(fee => fee.economyFee);
    console.log('Fee Rate: ', feeRate);
    const keyPair = ECPair.fromWIF(wif, network);
    const childNodeXOnlyPubkey = toXOnly(keyPair.publicKey);
    const tweakedChildNode = keyPair.tweak(
        bitcoin.crypto.taggedHash('TapTweak', childNodeXOnlyPubkey),
    );
    const {address: fromAddress, output} = bitcoin.payments.p2tr({internalPubkey: toXOnly(keyPair.publicKey), network});

    if (!fromAddress) {
        return;
    }

    // Fetch unspent outputs (UTXOs) for the fromAddress
    const utxos = await fetchUtxos(fromAddress);

    const psbt = new bitcoin.Psbt({network});

    // Calculate the fee
    const txSize = 500; // Estimate size of the transaction
    const fee = Math.floor(feeRate * txSize); // Calculate fee based on fee rate
    // Sign inputs
    let totalInput = 0;
    for (let i = 0; i < utxos.length; i++) {
        const utxo = utxos[i];
        console.log(utxo);
        console.log(`addInput ${i}`);
        psbt.addInput({
            hash: utxo.txid, // Transaction ID of the UTXO
            index: utxo.vout, // Output index of the UTXO
            witnessUtxo: {
                script: output!,
                value: BigInt(utxo.value)
            },
            tapInternalKey: childNodeXOnlyPubkey
        })
        totalInput += utxo.value;
    }
    if (totalInput < amountToSend) {
        throw new Error('Insufficient balance');
    }
    const amountToSendWithFee = amountToSend - fee; // Amount to send after deducting fee
    console.log({amountToSend, fee, amountToSendWithFee, totalInput});
    if (amountToSendWithFee < 0) {
        throw new Error('amountToSend - fee < 0');
    }

    // Add output
    psbt.addOutput({
        address: toAddress,
        value: BigInt(amountToSendWithFee),
    });
    // Add memo output
    // Add OP_RETURN output for memo
    if (memo) {
        const memoBuffer = Buffer.from(memo, 'utf8');
        const embed = bitcoin.payments.embed({data: [memoBuffer]});
        psbt.addOutput({
            script: embed.output!,
            value: BigInt(0), // OP_RETURN outputs do not carry value
        });
    }

    // Finalize the transaction
    psbt.signInput(0, tweakedChildNode).finalizeAllInputs();

    // Get the transaction hex
    const txHex = psbt.extractTransaction().toHex();

    console.log('Transaction Hex:', txHex);
    // broadcast the transaction
    const broadcastResponse = await broadcastTransaction(txHex);
    console.log('Broadcast Response:', broadcastResponse);
    return txHex;
}

// Function to fetch UTXOs for Testnet4
async function fetchUtxos(address: string) {
    // Example API call to a block explorer to get UTXOs for Testnet4
    const response = await axios.get(`https://mempool.space/testnet4/api/address/${address}/utxo`);
    return response.data.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
    }));
}

// Example usage
const wif = 'cR4id5io8gLdDSZpcUz9P1kXUpPiTKtvbS6aJuSuMNYzcVGmmsf4'; // Replace with your Testnet4 WIF private key
const toAddress = 'tb1ptv20dlft894l08d749lyyq8wsh8vykdxqj9eqgu98vptrj46julqy77clx'; // Replace with the recipient's address
const satoshi = 100000000;
const rawAmountToSend = 0.00002; // Amount to send in satoshis
const amountToSend = Math.floor(rawAmountToSend * satoshi);
const memo = 'Test transaction with memo';

transferBTC4(wif, toAddress, amountToSend, memo)
    .then(txHex => {
        console.log('Transaction ready to be broadcast:', txHex);
        // Here you can add code to broadcast the transaction using an API
    })
    .catch(error => {
        console.error('Error creating transaction:', error);
    });
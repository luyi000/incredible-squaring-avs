import axios from 'axios';

async function fetchTransaction(txid: string) {
    const url = `https://mempool.space/testnet4/api/tx/${txid}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        throw error;
    }
}

function decodeMemo(outputs: any[]) {
    for (const output of outputs) {
        // Check if the output is an OP_RETURN output
        const script = output.scriptpubkey;
        if (script && script.startsWith('6a')) { // OP_RETURN starts with 0x6a
            const data = script.slice(4); // Remove OP_RETURN prefix (0x6a + length byte)
             // Decode hex to UTF-8
            return Buffer.from(data, 'hex').toString('utf8');
        }
    }
    return null; // No memo found
}

// Example usage
const txid = '92515b756df18344aa2c4f11a9b5f59b66401e8f586479bbcd5a0c28513adbc1'; // Replace with the actual transaction ID

fetchTransaction(txid)
    .then(transaction => {
        console.log('Transaction Details:', transaction);
        const memo = decodeMemo(transaction.vout);
        if (memo) {
            console.log('Decoded Memo:', memo);
        } else {
            console.log('No memo found in the transaction outputs.');
        }
    })
    .catch(error => {
        console.error('Failed to decode memo:', error);
    });
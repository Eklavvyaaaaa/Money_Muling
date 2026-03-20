const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function test() {
    try {
        const csvPath = path.join(__dirname, 'sample_transactions.csv');
        const form = new FormData();
        form.append('file', fs.createReadStream(csvPath));

        console.log("Uploading file...");
        const uploadRes = await axios.post('http://localhost:5001/upload', form, {
            headers: form.getHeaders()
        });
        console.log("Upload Success! Nodes:", uploadRes.data.graph_data.nodes.length);

        console.log("Fetching deep dive for MERCHANT_01...");
        const ddRes = await axios.get('http://localhost:5001/account/MERCHANT_01/deepdive');
        console.log("Deep Dive Success!");
        // console.log(ddRes.data);
    } catch (error) {
        if (error.response) {
            console.error("API Error:", error.response.status, error.response.data);
        } else {
            console.error("Network Error:", error.message);
        }
    }
}

test();

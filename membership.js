import axios from "axios"
import moment from "moment"
import ethers from "ethers"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { env } = process
const contractAbi = [
    {
      "constant": true,
      "inputs": [
        {
          "name": "author",
          "type": "address"
        },
        {
          "name": "_weeks",
          "type": "uint16"
        }
      ],
      "name": "subscribe",
      "outputs": [
        {
          "name": "proxyTypeId",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "pure",
      "type": "function"
    }
  ];

const iface = new ethers.utils.Interface(contractAbi);

const decodeInputData = (inputData) => {
    const decodedData = iface.parseTransaction({ data: inputData });
    return decodedData;
  };

const getTransactions = async () => {
    const contractAddress = '0xd1Dc1A5b56EA321A921c74F8307153A58b1EfA4D';
    const apiKey = env.ETHERSCAN_API; // replace with your Etherscan API key
    const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`);
    const transactions = response.data.result.filter(transaction => transaction.methodId == "0x5bb80a5f");
    const authors = [];

    transactions.forEach(transaction => {
        const decodedInput = decodeInputData(transaction.input);
        const { author, _weeks } = decodedInput.args;
        const date = moment.unix(transaction.timeStamp).format('YYYY-MM-DD HH:mm:ss'); // convert Unix timestamp to readable date
        const expDate = moment(date).add(_weeks * 30, 'days').format('YYYY-MM-DD HH:mm:ss'); // add 30 days per week to the date
        const existingAuthor = authors.find(a => a.address === author);
        if (!existingAuthor){
            authors.push({
                address: author,
                startDate: date,
                expiration: expDate
            })
        } else {
            if (moment(date).isAfter(existingAuthor.expiration)) {
                existingAuthor.expiration = expDate;
                existingAuthor.startDate = date
            } else {
                existingAuthor.expiration = moment(existingAuthor.expiration).add(_weeks * 30, 'days').format('YYYY-MM-DD HH:mm:ss');
            }
        }
    });

    fs.writeFileSync( `${__dirname}/docs/membership.json`, JSON.stringify(authors, null, 2));

    return authors;
  };
  
  getTransactions();



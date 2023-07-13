import fetch from "node-fetch"
import jsonexport from "jsonexport"
import fs from "fs"
import path from 'path';
import floor from 'floor';
import ethers from 'ethers';
const { BigNumber, utils, constants, providers, Contract } = ethers
const { formatUnits, Fragment, Interface, parseBytes32String } = utils


import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main()

const round = 'round_125'
const batch = 400;
let airdropAddr = [];
let airdropAmount = [];

async function main(){
    const hash = "QmbJtmLQZaviTsaRQThiUHZykuwckj6Q3tJafeKV9YzJG5";
    const data = await (await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`)).json();

    const address = data.awards.map(i => `${i.address}`);
    const distribution = data.awards.map(i => `${i.amount0}`);

    console.log(distribution.length)

    if (address.length <= batch) {
        airdropAddr = address
        airdropAmount = distribution
    } else {
        for (var i=0; i<address.length/batch; i++){
            const addressChunk = sliceIntoChunks(address, batch);
            const distributionChunk = sliceIntoChunks(distribution, batch);
            airdropAddr.push(
                {
                    "address" : addressChunk[i],
                }
            );
            airdropAmount.push(
                {
                    "amount" : distributionChunk[i]
                }
            );
        }
    }



    const newFileNameBase = `${round}`
    fs.writeFileSync(`${__dirname}/out/${newFileNameBase}_address.${hash}.json`, JSON.stringify(airdropAddr, null, 2))
    fs.writeFileSync(`${__dirname}/out/${newFileNameBase}_amount.${hash}.json`, JSON.stringify(airdropAmount, null, 2))


function sliceIntoChunks(arr, chunkSize) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}

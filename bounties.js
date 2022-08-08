import snoowrap from "snoowrap"
import csv from "csvtojson"
import jsonexport from "jsonexport"
import fs from "fs"
import ipfsClient from "ipfs-http-client"
import fetch from "node-fetch"
import merklize from "./merklize.js"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LABEL = `missing_111`
const FILE = `${LABEL}.csv`

main()

async function main(){
  
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)
    const username = c.username
    // const username = c.username.replace(new RegExp('^u/'),"")

    if(!p[username]){
      p[username] = {username, address: c.blockchain_address, contrib:0, donut:0}
    }

    p[username].contrib += points

    return p
  },{})

  let data = merklize(Object.values(distribution), "address", "contrib", "donut", ["username"])

  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let {path} = await ipfs.add(JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`_proofs.${path}.json`)}`, JSON.stringify(data))

  console.log(path)
}

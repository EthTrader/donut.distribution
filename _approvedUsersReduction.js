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


main()

async function main(){

  let counter = 0
  let weight = 20000
  let approvedUsers = []

  const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())
  users.forEach(c=>{
    // console.log(c)
    if(c.weight >= weight) {
      // counter++
      approvedUsers.push(c)
    } 

  }
  )

  console.log("total approved users: " + approvedUsers.length)

  
  const newFileNameBase = `${__dirname}/docs/approvedUsers`
  fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(approvedUsers, null, 2))

}

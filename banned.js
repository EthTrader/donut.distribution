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
const banned = []

const credentials = {
  userAgent: 'Read Bot 1.0 by u/EthTraderCommunity',
  clientId: process.env.REDDIT_SCRIPT_CLIENT_ID,
  clientSecret: process.env.REDDIT_SCRIPT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
}

const reddit = new snoowrap(credentials)

main()

async function main(){
    const removedUsers = (await reddit.getSubreddit('ethtrader').getBannedUsers({limit: Infinity}).map(({ name }) => name))
    // removedUsers.forEach(test)
    // console.log(banned)

    const csvOut = await jsonexport(removedUsers)
    fs.writeFileSync(`${__dirname}/docs/banned.json`, JSON.stringify(removedUsers, null, 2))
    fs.writeFileSync(`${__dirname}/docs/banned.csv`, csvOut)
}

// function test(item) {
//     banned.push(item)
// }
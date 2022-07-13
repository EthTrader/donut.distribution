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
// const merklize = require('./merklize')


/* 
NOTE - 2022 batch 1 (6 months) done on round_105, batch 2 on round_111
*/
const DO_XDAI_DONUT_BATCH_TRANSFER = false                   // !!important to be correct!!
const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 10200000            //1,700,000 for 6 months (reflects latest halving)

const LABEL = `round_112`
const FILE = `${LABEL}.csv`
const MULTISIG_MAINNET = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E"
const MULTISIG_XDAI = "0x682b5664C2b9a6a93749f2159F95c23fEd654F0A"
const ETHTRADER_COMMUNITY_ADDRESS = "0xf7927bf0230c7b0E82376ac944AeedC3EA8dFa25"


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

  let custody = 0
  let l2Recipients = {}
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)/2      // !!important to remove '/2' if Reddit halves the karma csv!!
    const username = c.username.replace(new RegExp('^u/'),"")

    if(!p[username])
      p[username] = {username, address: c.blockchain_address, contrib:0, donut:0}
    p[username].contrib += points


    if(!l2Recipients[username]){
      l2Recipients[username] = {username, address: c.blockchain_address, donut:0}
    }
    custody += points
    l2Recipients[username].donut += points

    return p
  },{})
  
  /*
  DONUT UPVOTES (TIPS) SCRIPT: 
  */
  const donutUpvoteRewards = (await fetch(`https://ethtrader.github.io/community-mod/donut_upvote_rewards_${LABEL}.json`).then(res=>res.json())).rewards
  const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())
  donutUpvoteRewards.forEach(c=>{
    const points = parseInt(c.points)/2      // !!important to remove '/2' if Reddit halves the karma csv!!
    const username = c.username.replace(new RegExp('^u/'),"")
    if(distribution[username]){
      distribution[username].contrib += points

      custody += points
      l2Recipients[username].donut += points

    } else {
      const user = users.find(u=>u.username===username)
      if(user){
        const { address } = user
        distribution[username] = {username, address, contrib: points, donut:0}

        if(!l2Recipients[username]){
          l2Recipients[username] = {username, address, donut:0}
        }
        custody += points
        l2Recipients[username].donut += points

      } else {
        console.log(`no registered address for ${username}`)
      }
    }
  })

  /*
  PAY2POST SCRIPT: 
  */
  const pay2Post = (await fetch(`https://ethtrader.github.io/community-mod/pay2post_${LABEL}.json`).then(res=>res.json())).count

  pay2Post.forEach(c=>{
    const points = parseInt(c.donutFee)
    const username = c.username

    if(distribution[username]){
      distribution[username].contrib -= points
      l2Recipients[username].donut -= points
      if (distribution[username].contrib < 0) {
        distribution[username].contrib = 0
        l2Recipients[username].donut = 0
      }
    }
  })

  /*
  REMOVED USERS SCRIPT: 
  */
  const removedUsers = await fetch("https://ethtrader.github.io/donut.distribution/ineligible.json").then(res=>res.json())
  const removedNames = removedUsers.map(({ username }) => username)

  removedNames.forEach(username=>delete distribution[username])

  /*
  BRIDGE DONUTS TO GNOSIS CHAIN
  */
  if(DO_XDAI_DONUT_BATCH_TRANSFER){
    distribution["DonutMultisig"] = {
      username: "DonutMultisig",
      address: MULTISIG_MAINNET,
      contrib: 0,
      donut: XDAI_DONUT_BATCH_TRANSFER_AMOUNT
    }
  } else {
    distribution["DonutMultisig"] = {
      username: "DonutMultisig",
      address: MULTISIG_MAINNET,
      contrib: 0,
      donut: 0
    } 
  }

  const totalContrib = Object.values(distribution).reduce((p,c)=>{p+=c.contrib;return p;},0)
  const totalDonut = Object.values(distribution).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`custody: ${custody}, contrib: ${totalContrib}, donut: ${totalDonut}, u/EthTraderCommunity award: ${(distribution[ETHTRADER_COMMUNITY_ADDRESS] ? distribution[ETHTRADER_COMMUNITY_ADDRESS].donut : 0)}, multisig: ${distribution["DonutMultisig"].donut}`)

  const l2RecipientTotal = Object.values(l2Recipients).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`l2 recipient total: ${l2RecipientTotal}`)
  const csvOut = await jsonexport(Object.values(distribution))

  let data = merklize(Object.values(distribution), "address", "contrib", "donut", ["username"])

  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let {path} = await ipfs.add(JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`.${path}.csv`)}`, csvOut)
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`_proofs.${path}.json`)}`, JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`_l2.${path}.json`)}`, JSON.stringify(Object.values(l2Recipients)))
  console.log(path)
}

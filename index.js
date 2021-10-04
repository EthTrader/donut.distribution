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
const removedUsers = ["Positive_Eagle_"]
console.log(`removed: ${removedUsers}`)

const label = `round_102`
const file = `${label}.csv`
const multisig = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E"
const uEthTraderCommunityAddress = "0xf7927bf0230c7b0E82376ac944AeedC3EA8dFa25"
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

  let optIn1 = (await reddit.getSubmission('ll8wwg').expandReplies({limit: Infinity, depth: 1})).comments
  console.log(`optIn1: ${optIn1.length}`)
  // let optIn2 = (await reddit.getSubmission('pg1esc').expandReplies({limit: Infinity, depth: 1})).comments
  let optIn2 = (await reddit.getSubmission('p5ik6b').expandReplies({limit: Infinity, depth: 1})).comments
  console.log(`optIn2: ${optIn2.length}`)
  let optOuts2 = (await reddit.getComment('h9639cx').expandReplies({limit: Infinity, depth: 1})).replies
  console.log(`optOuts2: ${optOuts2.length}`)
  let optIn = optIn1.concat(optIn2)
  let optInUsers = optIn.reduce((p,c)=>{
    let out = optOuts2.find(o=>o.author.name===c.author.name)
    if(!out) {
      p[`${c.author.name}`] = true
    }
    return p
  },{})

  let custody = 0
  let l2Recipients = {}
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${file}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)
    const username = c.username.replace(new RegExp('^u/'),"")

    if(!p[username])
      p[username] = {username, address: c.blockchain_address, contrib:0, donut:0}
    p[username].contrib += points
    if(optInUsers[username]){
      if(!l2Recipients[username]){
        l2Recipients[username] = {username, address: c.blockchain_address, donut:0}
      }
      custody += points
      l2Recipients[username].donut += points
    } else {
      p[username].donut += points
    }
    return p
  },{})

  const donutUpvoteRewards = (await fetch(`https://ethtrader.github.io/community-mod/donut_upvote_rewards_${label}.json`).then(res=>res.json())).rewards
  const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())
  donutUpvoteRewards.forEach(c=>{
    const points = parseInt(c.points)
    const username = c.username.replace(new RegExp('^u/'),"")
    if(distribution[username]){
      distribution[username].contrib += points
      if(optInUsers[username]) {
        custody += points
        l2Recipients[username].donut += points
      } else {
        distribution[username].donut += points
      }
    } else {
      const user = users.find(u=>u.username===username)
      if(user){
        const { address } = user
        distribution[username] = {username, address, contrib: points, donut:0}
        if(optInUsers[username]) {
          if(!l2Recipients[username]){
            l2Recipients[username] = {username, address, donut:0}
          }
          custody += points
          l2Recipients[username].donut += points
        } else {
          distribution[username].donut += points
        }
      } else {
        console.log(`no registered address for ${username}`)
      }
    }
  })

  removedUsers.forEach(username=>delete distribution[username])

  distribution["DonutMultisig"] = {
    username: "DonutMultisig",
    address: multisig,
    contrib: 0,
    // donut: 600000 + custody                                                     // 600k = dev allocation
    donut: 510000 + custody                                                     // 510k = dev allocation
  }

  let uEthTraderCommunityAward
  if(distribution[uEthTraderCommunityAddress]){
    uEthTraderCommunityAward = distribution[uEthTraderCommunityAddress].donut
    distribution["DonutMultisig"].donut += uEthTraderCommunityAward
    console.log(`redirect ${uEthTraderCommunityAward} from u/EthTraderCommunity to DonutMultisig`)
    delete distribution[uEthTraderCommunityAddress]
  }
  const totalContrib = Object.values(distribution).reduce((p,c)=>{p+=c.contrib;return p;},0)
  const totalDonut = Object.values(distribution).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`custody: ${custody}, contrib: ${totalContrib}, donut: ${totalDonut}, u/EthTraderCommunity award: ${(uEthTraderCommunityAward || 0)}, multisig: ${distribution["DonutMultisig"].donut}`)

  const l2RecipientTotal = Object.values(l2Recipients).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`l2 recipient total: ${l2RecipientTotal}`)
  console.log(`l2 recipient total + u/EthTraderCommunity award + 600k dev allocation = multisig amount (${l2RecipientTotal + (uEthTraderCommunityAward || 0) + 600000 === distribution["DonutMultisig"].donut})`)
  const csvOut = await jsonexport(Object.values(distribution))
  // console.log(csvOut)
  let data = merklize(Object.values(distribution), "address", "contrib", "donut", ["username"])

  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let {path} = await ipfs.add(JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${file.replace('.csv',`.${path}.csv`)}`, csvOut)
  fs.writeFileSync( `${__dirname}/out/${file.replace('.csv',`_proofs.${path}.json`)}`, JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${file.replace('.csv',`_l2.${path}.json`)}`, JSON.stringify(Object.values(l2Recipients)))
  console.log(path)
  // for await (const item of added) {
  //   console.log(item)
  // }
}

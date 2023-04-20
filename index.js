import snoowrap from "snoowrap"
import csv from "csvtojson"
import jsonexport from "jsonexport"
import fs from "fs"
import ipfsClient from "ipfs-http-client"
import fetch from "node-fetch"
import merklize from "./merklize.js"
import path from 'path';
import { fileURLToPath } from 'url';
// import { noConflict } from "snoowrap"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const merklize = require('./merklize')


/* 
NOTE - 2022 batch 1 (6 months) done on round_105, batch 2 on round_111, batch 3 on round_117
*/
const DO_XDAI_DONUT_BATCH_TRANSFER = false                // !!important to be correct!!
const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 10200000         // 1,700,000 for 6 months (reflects latest halving)

// This should be set to 0
const MAINNET_MULTISIG_MINT_AMOUNT = 0              // use only for one time mints. 9/06 - fund mainnet staking contract


const LABEL = `round_122`
const FILE = `${LABEL}.csv`
const MULTISIG_MAINNET = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E"
const MULTISIG_XDAI = "0x682b5664C2b9a6a93749f2159F95c23fEd654F0A"
const ETHTRADER_COMMUNITY_ADDRESS = "0xf7927bf0230c7b0E82376ac944AeedC3EA8dFa25"
const voterList = []
const pollID = [
    "0x6a278d5d0c8e5fe5df366c9519e6f75e1ca6167696e9b736ec9ae3750b3ccfce",
    "0x9fc2f1e4d6907ea60406937bfe79439c4d8d379a699d4a22a0efdedc06114f54"
]

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
  let distributionSummary = {}
  let totalPay2Post = 0
  let totalIneligible = 0
  let totalVoterBonus = 0
  
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)/2      // !!important to remove '/2' if Reddit halves the karma csv!!
    const username = c.username.replace(new RegExp('^u/'),"")

    if(!p[username]){
      p[username] = {username, address: c.blockchain_address, contrib:0, donut:0}
    }

    if(!distributionSummary[username]){
      distributionSummary[username] = {
        username, 
        address: c.blockchain_address, 
        donut: 0,
        data: {
          removed: false,
          removalReason: null,
          fromKarma: 0,
          fromTipsGiven: 0,
          fromTipsRecd: 0,
          pay2PostFee: 0
        }
      }}

    p[username].contrib += points
    custody += points
    distributionSummary[username].donut += points
    distributionSummary[username].data.fromKarma += points

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
      distributionSummary[username].donut += points

      if (c.contributor_type == 'donut_upvoter') distributionSummary[username].data.fromTipsGiven = points
      if (c.contributor_type == 'quad_rank') distributionSummary[username].data.fromTipsRecd = points 

    } else {
      const user = users.find(u=>u.username===username)
      if(user){
        const { address } = user
        distribution[username] = {username, address, contrib: points, donut:0}

        if(!distributionSummary[username]){
          distributionSummary[username] = {
            username, 
            address: c.blockchain_address, 
            donut: 0,
            data: {
              removed: false,
              removalReason: null,
              fromKarma: 0,
              fromTipsGiven: 0,
              fromTipsRecd: 0,
              voterBonus: 0,
              pay2PostFee: 0
            }
            
          }
        }
        custody += points
        distributionSummary[username].donut += points
        
        if (c.contributor_type == 'donut_upvoter') distributionSummary[username].data.fromTipsGiven = points
        if (c.contributor_type == 'quad_rank') distributionSummary[username].data.fromTipsRecd = points 

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
      distributionSummary[username].donut -= points
      distributionSummary[username].data.pay2PostFee = points
      totalPay2Post += points

      if (distribution[username].contrib < 0) {
        totalPay2Post += distribution[username].contrib
        distribution[username].contrib = 0
        distributionSummary[username].donut = 0
        distributionSummary[username].data.pay2PostFee = points
      }
    }
  })

  /*
  REMOVED USERS SCRIPT: 
  */
  const removedUsers = await fetch(`https://raw.githubusercontent.com/EthTrader/donut.distribution/main/out/ineligible_${LABEL}.json`).then(res=>res.json())
  const removedNames = removedUsers.map(({ username }) => username)

  removedUsers.forEach( c => {
    const reason = c.removal
    const username = c.username

    if(distribution[username]){
      distributionSummary[username].data.removed = true
      distributionSummary[username].data.removalReason = reason
      distributionSummary[username].donut = 0
      totalIneligible += distribution[username].contrib
    }
  })

  removedNames.forEach(username=>delete distribution[username])

  /*
  VOTER INCENTIVE SCRIPT:
  */
  const voterList = (await fetch(`https://raw.githubusercontent.com/EthTrader/donut.distribution/main/out/voters_${LABEL}.json`).then(res=>res.json())).voters

  // console.log(voterList)
  voterList.forEach ( c => {
    const address = c.address
    const qty = c.qty
    const user = users.find(u=>u.address===address)
    const username = user.username

    if(username) {
      if(distribution[username]){
        const points = distribution[username].contrib
        distribution[username].contrib += (points*(5+(qty-1))/100)
        distributionSummary[username].donut += (points*(5+(qty-1))/100)
        distributionSummary[username].data.pay2PostFee = (points*(5+(qty-1))/100)
        totalVoterBonus += (points*(5+(qty-1))/100)
        // console.log(username + "; Sub-Total: " + points + "; Bonus: " + (5+(qty-1)) + "%; Donut Add: " + (points*(5+(qty-1))/100) + "; Total: " + (points+(points*(5+(qty-1))/100)) )
    } else {

    }
  }

  })

  /*
  BRIDGE donut TO GNOSIS CHAIN
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
      donut: MAINNET_MULTISIG_MINT_AMOUNT
    } 
  }


  
  const totalContrib = Object.values(distribution).reduce((p,c)=>{p+=c.contrib;return p;},0)
  const totalDonut = Object.values(distribution).reduce((p,c)=>{p+=c.donut;return p;},0)

  const out = {label: LABEL, totalDistribution: totalContrib, pay2post: totalPay2Post, totalVoterBonus: totalVoterBonus, totalFromRemovedUsers: totalIneligible, summary: distributionSummary}
  console.log(`custody: ${custody}, total distribution: ${totalContrib}, pay2post fee: ${totalPay2Post}, total voter bonus: ${totalVoterBonus}, total from removed users: ${totalIneligible}, u/EthTraderCommunity award: ${(distribution[ETHTRADER_COMMUNITY_ADDRESS] ? distribution[ETHTRADER_COMMUNITY_ADDRESS].donut : 0)}, multisig: ${distribution["DonutMultisig"].donut}`)

  // const l2RecipientTotal = Object.values(distributionSummary).reduce((p,c)=>{p+=c.donut;return p;},0)
  // console.log(`l2 recipient total: ${l2RecipientTotal}`)
  const csvOut = await jsonexport(Object.values(distribution))

  let data = merklize(Object.values(distribution), "address", "contrib", "donut", ["username"])

  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let {path} = await ipfs.add(JSON.stringify(data))
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`.${path}.csv`)}`, csvOut)
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`_proofs.${path}.json`)}`, JSON.stringify(data))
  fs.copyFileSync(`${__dirname}/out/${LABEL}_proofs.${path}.json`, `${__dirname}/docs/distribution.json`)
  fs.writeFileSync( `${__dirname}/out/${FILE.replace('.csv',`_summary.${path}.json`)}`, JSON.stringify(out))
  fs.copyFileSync(`${__dirname}/out/${LABEL}_summary.${path}.json`, `${__dirname}/docs/distributionSummary.json`)


  console.log(path)
}
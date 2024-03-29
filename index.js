import snoowrap from "snoowrap"
import csv from "csvtojson"
import jsonexport from "jsonexport"
import fs from "fs"
import ipfsClient from "ipfs-http-client"
import { createHelia } from 'helia'
import { json } from '@helia/json'
import fetch from "node-fetch"
import merklize from "./merklize.js"
import path from 'path';
import { fileURLToPath } from 'url';
import BigNumber from "bignumber.js"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const decimals = new BigNumber(10).pow(18)


/* 
NOTE - 2022 batch 1 (6 months) done on round_105, batch 2 on round_111, batch 3 on round_117, batch 4 on round_123
*/
const DO_XDAI_DONUT_BATCH_TRANSFER = false                // !!important to be correct!!
// const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 10200000         // 1,700,000 for 6 months (reflects latest halving)
const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 12800000         // only for round 123 (includes gnosis staking )

// This should be set to 0
const MAINNET_MULTISIG_MINT_AMOUNT = 0              // use only for one time mints. 9/06 - fund mainnet staking contract



const LABEL = `round_130`
const FILE = `${LABEL}_adjusted.csv`
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


// TODO - do this dynamically
const MODS = [
  "aminok",
  "dont_forget_canada",
  "nootropicat",
  "Basoosh",
  "carlslarson",
  "Jake123194",
  "mattg1981",
  "reddito321"
]

const TEMP_BANNED = [
  "tambaybtc",
  "actuatorsif5",
  "Icy-Profile-1655"
].map(username => ({ username, removal: 'banned' }))

const MOD_ALLOCATION = 85000/MODS.length

const ORGANIZERS = ["carlslarson", "mattg1981", "reddito321"]
const ORGANIZER_REWARD = 25000/ORGANIZERS.length         // https://snapshot.org/#/ethtraderdao.eth/proposal/0x8ff68520b909ad93fc86643751e6cc32967d4df5f3fd43a00f50e9e80d74ed3b

const reddit = new snoowrap(credentials)

main()

async function main(){

  const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())

  let distributionSummary = {}
  let totalPay2Post = 0
  let totalIneligible = 0
  let totalVoterBonus = 0

  const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    // totalPay2Post += Math.abs(c.pay2post)
    const points = parseFloat(c.points)
    const adjustment = parseFloat(c.net_e2t)
    // if(points <=0 ) return p        // need to ignore after-pay2post negative earners

    const username = c.username.replace(new RegExp('^u/'),"")

    addToDistribution(p, username, c.blockchain_address)

    addToDistributionSummary(distributionSummary, username, c.blockchain_address)

    p[username].contrib += points
    p[username].donut += points
    p[username].adjustment += adjustment
    distributionSummary[username].donut += points
    distributionSummary[username].data.fromKarma += points
    distributionSummary[username].data.pay2PostFee += Math.abs(c.pay2post)

    return p
  },{})

  /*
  MODS
  */
  MODS.forEach(username=>{
    const points = MOD_ALLOCATION

    if(!distribution[username]){
      const { address } = users.find(u=>u.username===username)

      addToDistribution(distribution, username, address)
      addToDistributionSummary(distributionSummary, username, address)
    }

    distribution[username].contrib += points
    distribution[username].donut += points
    distributionSummary[username].donut += points
  })

  /*
  ORGANIZERS
  */

  ORGANIZERS.forEach(organizer=>{
    distribution[organizer].donut += ORGANIZER_REWARD
    distributionSummary[organizer].donut += ORGANIZER_REWARD
  })

  /*
  DONUT UPVOTES (TIPS) SCRIPT: 
  */
  const donutUpvoteRewards = (await fetch(`https://ethtrader.github.io/community-mod/donut_upvote_rewards_${LABEL}.json`).then(res=>res.json())).rewards

  // const donutUpvoteRewards = await csv().fromFile(`${__dirname}/in/donut_upvote_rewards_${LABEL}.csv`)
  donutUpvoteRewards.forEach(c=>{
    const points = parseFloat(c.points)
    const username = c.username.replace(new RegExp('^u/'),"")

    if(!distribution[username]){
      const user = users.find(u=>u.username===username)
      if(!user){
        console.log(`${username} is not registered`)
        return
      }

      const {address} = user
      addToDistribution(distribution, username, address)
      addToDistributionSummary(distributionSummary, username, address)
    }

    distribution[username].contrib += points
    distribution[username].donut += points
    distributionSummary[username].donut += points

    if (c.contributor_type == 'donut_upvoter') distributionSummary[username].data.fromTipsGiven = points
    if (c.contributor_type == 'quad_rank') distributionSummary[username].data.fromTipsRecd = points 
  })

  /*
  VOTER INCENTIVE SCRIPT:
  */
  const voterList = (await fetch(`https://raw.githubusercontent.com/EthTrader/donut.distribution/main/out/voters_${LABEL}.json`).then(res=>res.json())).voters

  voterList.forEach ( c => {
    const address = c.address
    const qty = c.qty
    const user = users.find(u=>u.address===address)
    const username = user.username

    if(username) {
      if(distribution[username]){
        const contrib = distribution[username].contrib
        const donut = distribution[username].donut
        distribution[username].contrib += (contrib*(5+(qty-1))/100)
        distribution[username].donut += (donut*(5+(qty-1))/100)
        distributionSummary[username].donut += (donut*(5+(qty-1))/100)
        distributionSummary[username].data.voterBonus = (donut*(5+(qty-1))/100)
        totalVoterBonus += (donut*(5+(qty-1))/100)
      } 
    }
  })

  /*
  PAY2POST SCRIPT: 
  COMMENTING THIS SECTION SINCE PAY2POST IS NOW INCLUDED IN CSV POINTS TALLY
  */
  // const pay2Post = (await fetch(`https://ethtrader.github.io/community-mod/pay2post_${LABEL}.json`).then(res=>res.json())).count

  // pay2Post.forEach(c=>{
  //   const points = parseInt(c.donutFee)
  //   const username = c.username

  //   if(distribution[username]){
  //     distribution[username].contrib -= points
  //     distribution[username].donut -= points
  //     distributionSummary[username].donut -= points
  //     distributionSummary[username].data.pay2PostFee = points
  //     totalPay2Post += points

  //     if (distribution[username].contrib < 0) {
  //       delete distribution[username]
  //       distributionSummary[username].donut = 0
  //     }
  //   }
  // })

  /*
  REMOVED USERS SCRIPT: 
  */
  let removedUsers = await fetch(`https://raw.githubusercontent.com/EthTrader/donut.distribution/main/out/ineligible_${LABEL}.json`).then(res=>res.json())
  removedUsers = removedUsers.concat(TEMP_BANNED)

  const specialMembership = await fetch(`https://ethtrader.github.io/donut.distribution/membership.json`).then(res=>res.json())
  const specialMembers = specialMembership.map(({ address }) => address)

  removedUsers.forEach(c => {
    const reason = c.removal
    const username = c.username
  
    if(distribution[username]){
      // Get the user's address
      const userAddress = distribution[username].address;
  
      // Check if the user's address is not in the specialMembership array
      if(specialMembers.includes(userAddress) && ["age", "karma"].includes(reason)) {
        distributionSummary[username].data.removalReason = "special membership"
      } else {
        distributionSummary[username].data.removed = true
        distributionSummary[username].data.removalReason = reason
        distributionSummary[username].donut = 0
        totalIneligible += distribution[username].contrib
        delete distribution[username]
      } 
    }
  })

  /*
  APPLY ADJUSTMENTS SCRIPT:
  */

  Object.values(distribution).forEach(user=>{
    if(user.adjustment){
      user.donut += user.adjustment
      distributionSummary[user.username].donut = user.donut
    }
    if(user.donut < 0) user.donut = 0
    if(user.contrib < 0) user.contrib = 0
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
  } else if (MAINNET_MULTISIG_MINT_AMOUNT) {
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
  console.log(`total distribution: ${totalContrib}, pay2post fee: ${totalPay2Post}, total voter bonus: ${totalVoterBonus}, total from removed users: ${totalIneligible}, u/EthTraderCommunity award: ${(distribution[ETHTRADER_COMMUNITY_ADDRESS] ? distribution[ETHTRADER_COMMUNITY_ADDRESS].donut : 0)}, multisig: ${distribution["DonutMultisig"] ? distribution["DonutMultisig"].donut : 0}`)

  const csvOut = await jsonexport(Object.values(distribution))

  let merkled = merklize(Object.values(distribution), "address", "contrib", "donut", ["username"])

  // let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  // let {path} = await ipfs.add(JSON.stringify(merkled))

  const addresses = Object.values(distribution).reduce((p,c)=>{
    p.push(c.address);
    return p;
  },[])

  const contribAmounts = Object.values(distribution).reduce((p,c)=>{
    const contrib = (new BigNumber(c.contrib.toString())).times(decimals)
    p.push(contrib.toFixed());
    return p;
  },[])

  const donutAmounts = Object.values(distribution).reduce((p,c)=>{
    const donut = (new BigNumber(c.donut.toString())).times(decimals)
    p.push(donut.toFixed());
    return p;
  },[])

  const transactionData = {
    addresses,
    contrib: contribAmounts,
    donut: donutAmounts
  }

  // return

  const helia = await createHelia()
  const j = json(helia)
  const ipfsAddress = await j.add(merkled)

  fs.writeFileSync( `${__dirname}/out/${LABEL}_tx_data.${ipfsAddress.toString()}.json`, JSON.stringify(transactionData))
  fs.writeFileSync( `${__dirname}/out/${LABEL}.${ipfsAddress.toString()}.csv`, csvOut)
  fs.writeFileSync( `${__dirname}/out/${LABEL}_proofs.${ipfsAddress.toString()}.json`, JSON.stringify(merkled))
  fs.copyFileSync(`${__dirname}/out/${LABEL}_proofs.${ipfsAddress.toString()}.json`, `${__dirname}/docs/distribution.json`)
  fs.writeFileSync( `${__dirname}/out/${LABEL}_summary.${ipfsAddress.toString()}.json`, JSON.stringify(out))
  fs.copyFileSync(`${__dirname}/out/${LABEL}_summary.${ipfsAddress.toString()}.json`, `${__dirname}/docs/distributionSummary.json`)

  console.log(ipfsAddress.toString())
}

function addToDistributionSummary(summary, username, address){
  if(!summary[username]){
    summary[username] = {
      username, 
      address, 
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
}

function addToDistribution(distribution, username, address){
  if(!distribution[username]){
    distribution[username] = {username, address, contrib:0, donut:0, adjustment: 0}
  }
}
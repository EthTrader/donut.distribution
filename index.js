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


/* 
NOTE - 2022 batch 1 (6 months) done on round_105, batch 2 on round_111, batch 3 on round_117, batch 4 on round_123
*/
const DO_XDAI_DONUT_BATCH_TRANSFER = false                // !!important to be correct!!
// const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 10200000         // 1,700,000 for 6 months (reflects latest halving)
const XDAI_DONUT_BATCH_TRANSFER_AMOUNT = 12800000         // only for round 123 (includes gnosis staking )

// This should be set to 0
const MAINNET_MULTISIG_MINT_AMOUNT = 0              // use only for one time mints. 9/06 - fund mainnet staking contract


const LABEL = `round_127`
const FILE = `${LABEL}.csv`
const MULTISIG_MAINNET = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E"
const MULTISIG_XDAI = "0x682b5664C2b9a6a93749f2159F95c23fEd654F0A"
const ETHTRADER_COMMUNITY_ADDRESS = "0xf7927bf0230c7b0E82376ac944AeedC3EA8dFa25"
let addressChange = [
  {
    username: "Acceptable-Sort-8429",
    address: "0x600cBA9eCaB71BD06Cd90Ca2572fCF9379fbDbE9"
  },
  {
    username: "johnnyb0083",
    address: "0xf3309B93D319F6cB8872CF3D7e2307ed8DBfc9c0"
  },
 {
    username: "LeThaLxdARk",
    address: "0x1bf8F71F41D48Ebf84058832dC934920A0B2f256"
  },
 {
    username: "Nachtaktiv",
    address: "0x416246E0227eE362D4A4679ADc91e644031184A0"
  },
 {
    username: "GapingFartLocker",
    address: "0x13CA39C566ACf798c49e481b9960E35dD9860DA9"
  }
]

const specialMembership = [
  "0x5Bb626b3ad10ABb1E9055292126fe7a6AC6e3ea3",
  "0xd2D117e6dbbfdD74D6b865ff859a4611bD29F3Ed",
  "0x002fb0c5d1209f8f5616BA3d211Be36c4D237d55",
  "0x54C334fa1A5BC243874eB6f7573E2e6e4e305Df0",
  "0xA4d537811A3DB27d92502E8FC62CbeB2DF7D9BAF",
  "0x1bf8F71F41D48Ebf84058832dC934920A0B2f256",
  "0xa51731189c99832A2ba2f28C6c2dc1Db451F3a2e",
  "0xb89CB46A5Cf811b99A3608C8b9e63aD0DE990Fe0",
  "0x12859b4528b8B9EFaDc5530e30721a6087FBB4Fd",
  "0x8424782665f9D16FbD8A30F0cDE6109bdAB496c1",
  "0xA503c0E06e5cCf0B599771339158aDF58FAe8728",
  "0x378Ea7e7E7Db2501573a22aecc4A2269C89642C1",
  "0xfd1e50BcDA3A1f9eBe6E50Bdf80cbd2c3D6a1fB0",
  "0x1b036f17F5DcB000005e14773f8636b4dde76e39",
  "0xEdc0321b407b165CF926BE3E77ecB6C791f731bA",
  "0x3A11c76440655D4DdFF16a4aDAbBa15E98E89786",
  "0xA503c0E06e5cCf0B599771339158aDF58FAe8728",
  "0x3cAa5fa6358Ae6972bc92F5A96444ED4AabF4737",
  "0xb17DcDD2bcd04d9B19B768d87600a5B5b45db82d",
  "0x753F545dCBbC15744C8441089b64D5c567a306b6",
  "0x549ab2CfaA7fb1d1B8AF6E0654efb24CC65c76E6",
  "0x52a7f4e8904F70Ea831ED31511b35AadCB36b1d9",
  "0x713376C3BB65E786d8aA0FcFfFfB39472F23e6A6",
  "0xe7F3c9746282d534f8C90fD410624333e23AC565"
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
          voterBonus: 0,
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

  removedUsers.forEach(c => {
    const reason = c.removal
    const username = c.username
  
    if(distribution[username]){
      // Get the user's address
      const userAddress = distribution[username].address;
  
      // Check if the user's address is not in the specialMembership array
      if (!specialMembership.includes(userAddress)) {
        distributionSummary[username].data.removed = true
        distributionSummary[username].data.removalReason = reason
        distributionSummary[username].donut = 0
        totalIneligible += distribution[username].contrib
      } else {
        distributionSummary[username].data.removalReason = "special membership"
      }
    }
  })

  removedNames.forEach(username => {
    // Get the user's address
    const userAddress = distribution[username]?.address;
  
    // Only delete the user from distribution if their address is not in specialMembership
    if (!specialMembership.includes(userAddress)) {
      delete distribution[username];
    }
  });

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
        const points = distribution[username].contrib
        distribution[username].contrib += (points*(5+(qty-1))/100)
        distributionSummary[username].donut += (points*(5+(qty-1))/100)
        distributionSummary[username].data.voterBonus = (points*(5+(qty-1))/100)
        totalVoterBonus += (points*(5+(qty-1))/100)
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


  addressChange.map(c => {
    if (distribution[c.username]) {
      distribution[c.username].address = c.address
      distributionSummary[c.username].address = c.address
      console.log("registered address change: " + c.username)
    }
  });

  
  const totalContrib = Object.values(distribution).reduce((p,c)=>{p+=c.contrib;return p;},0)
  const totalDonut = Object.values(distribution).reduce((p,c)=>{p+=c.donut;return p;},0)

  const out = {label: LABEL, totalDistribution: totalContrib, pay2post: totalPay2Post, totalVoterBonus: totalVoterBonus, totalFromRemovedUsers: totalIneligible, summary: distributionSummary}
  console.log(`custody: ${custody}, total distribution: ${totalContrib}, pay2post fee: ${totalPay2Post}, total voter bonus: ${totalVoterBonus}, total from removed users: ${totalIneligible}, u/EthTraderCommunity award: ${(distribution[ETHTRADER_COMMUNITY_ADDRESS] ? distribution[ETHTRADER_COMMUNITY_ADDRESS].donut : 0)}, multisig: ${distribution["DonutMultisig"].donut}`)

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

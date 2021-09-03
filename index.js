const snoowrap = require('snoowrap')
const csv=require("csvtojson")
const jsonexport = require('jsonexport')
const fs = require("fs")
const ipfsClient = require('ipfs-http-client')
const merklize = require('./merklize')

const file = `round_101.csv`
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
  let optIn2 = (await reddit.getSubmission('pg1esc').expandReplies({limit: Infinity, depth: 1})).comments
  console.log(`optIn2: ${optIn2.length}`)
  let optOuts2 = (await reddit.getComment('h9639cx').expandReplies({limit: Infinity, depth: 1})).replies
  console.log(`optOuts2: ${optOuts2.length}`)
  let optIn = optIn1.concat(optIn2)
  let optInUsers = optIn.reduce((p,c)=>{
    let out = optOuts2.find(o=>o.author.name===c.author.name)
    if(!out) {
      p[`u/${c.author.name}`] = true
    }
    return p
  },{})

  let custody = 0
  let l2Recipients = {}
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${file}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    let points = c.points
    if(points && c.contributor_type === "contributor"){
      points = Math.round(points*80/95)                                         // reduce and send to multisig as 15% dev allocation
    }
    const donut = parseInt(c.donut || points)
    const contrib = parseInt(c.contrib || points)
    if(!p[c.blockchain_address])
      p[c.blockchain_address] = {username: c.username, address: c.blockchain_address, contrib:0, donut:0}
    p[c.blockchain_address].contrib += contrib
    if(optInUsers[c.username]){
      if(!l2Recipients[c.blockchain_address]){
        l2Recipients[c.blockchain_address] = {username: c.username, address: c.blockchain_address, donut:0}
      }
      custody += donut
      l2Recipients[c.blockchain_address].donut += donut
    } else {
      p[c.blockchain_address].donut += donut
    }
    return p
  },{})

  distribution["DonutMultisig"] = {
    username: "DonutMultisig",
    address: multisig,
    contrib: 0,
    donut: 600000 + custody                                                     // 600k = dev allocation
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

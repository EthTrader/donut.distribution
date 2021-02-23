const snoowrap = require('snoowrap')
const csv=require("csvtojson")
const jsonexport = require('jsonexport')
const fs = require("fs")
const ipfsClient = require('ipfs-http-client')
const merklize = require('./merklize')

const file = `round_94.csv`
const multisig = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E"
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
  let optInThread = await reddit.getSubmission('ll8wwg').expandReplies({limit: Infinity, depth: Infinity})
  let optInUsers = optInThread.comments.reduce((p,c)=>{
    p[`u/${c.author.name}`] = true
    return p
  },{})
  let custody = 0
  let l2Recipients = {}
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${file}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)
    if(!p[c.username])
      p[c.username] = {username: c.username, address: c.blockchain_address, contrib:0, donut:0}
    p[c.username].contrib += points
    if(optInUsers[c.username]){
      if(!l2Recipients[c.username]){
        l2Recipients[c.username] = {username: c.username, address: c.blockchain_address, donut:0}
      }
      custody += points
      l2Recipients[c.username].donut += points
    } else {
      p[c.username].donut += points
    }
    return p
  },{})

  distribution["DonutMultisig"] = {
    username: "DonutMultisig",
    address: multisig,
    contrib: 0,
    donut: custody
  }

  let uEthTraderCommunityAward
  if(distribution["u/EthTraderCommunity"]){
    uEthTraderCommunityAward = distribution["u/EthTraderCommunity"].donut
    distribution["DonutMultisig"].donut += uEthTraderCommunityAward
    console.log(`redirect ${uEthTraderCommunityAward} from u/EthTraderCommunity to DonutMultisig`)
    delete distribution["u/EthTraderCommunity"]
  }
  const totalContrib = Object.values(distribution).reduce((p,c)=>{p+=c.contrib;return p;},0)
  const totalDonut = Object.values(distribution).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`contrib: ${totalContrib}, donut: ${totalDonut}, u/EthTraderCommunity award: ${uEthTraderCommunityAward}, multisig: ${distribution["DonutMultisig"].donut}`)
  console.log(`check total contrib + u/EthTraderCommunity award = totalDonut (${totalContrib + uEthTraderCommunityAward === totalDonut})`)

  const l2RecipientTotal = Object.values(l2Recipients).reduce((p,c)=>{p+=c.donut;return p;},0)
  console.log(`l2 recipient total: ${l2RecipientTotal}`)
  console.log(`l2 recipient total + u/EthTraderCommunity award = multisig amount (${l2RecipientTotal + uEthTraderCommunityAward === distribution["DonutMultisig"].donut})`)
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

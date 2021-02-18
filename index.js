const snoowrap = require('snoowrap')
const csv=require("csvtojson")

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
  const distributionCSV = await csv().fromFile(`${__dirname}/in/${file}`)
  const distribution = distributionCSV.reduce((p,c)=>{
    const points = parseInt(c.points)
    if(!p[c.username])
      p[c.username] = {username: c.username, address: c.blockchain_address, contrib:0, donut:0}
    p[c.username].contrib += points
    if(optInUsers[c.username]){
      custody += points
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
  console.log(`contrib: ${totalContrib}, donut: ${totalDonut}, uEthTraderCommunityAward: ${uEthTraderCommunityAward}, multisig: ${distribution["DonutMultisig"].donut}`)
  console.log(`check totalContrib + uEthTraderCommunityAward = totalDonut (${totalContrib + uEthTraderCommunityAward === totalDonut})`)
}

const { ethers } = require("ethers")
const fetch = require('node-fetch')
const jsonexport = require('jsonexport')
const fs = require("fs")
const provider = new ethers.getDefaultProvider('mainnet', {
  alchemy: process.env.ALCHEMY_API,
  infura: {
    projectId: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET
  }
})
const AirdropDuoABI = require("./abi/AirdropDuoABI")
const airdrop = new ethers.Contract(process.env.AIRDROP_ADDRESS, AirdropDuoABI, provider)

main()

async function main(){
  let events = await airdrop.queryFilter(airdrop.filters.Start())
  let airdrops = await Promise.all(events.map(async (e)=>{
    const id = e.args.id.toNumber()
    const hash = (await airdrop.airdrops(id)).dataURI.replace("ipfs:","")
    const {awards} = await (await fetch(`https://ipfs.io/ipfs/${hash}`)).json()
    return awards
  }))
  let users = airdrops.reduce((p,airdrop)=>{
    airdrop.forEach(award=>{
      if(award.username)
      p[award.username]={username: award.username, address: award.address}
    })
    return p
  },{})
  console.log(Object.keys(users).length)
  const csvOut = await jsonexport(Object.values(users))
  fs.writeFileSync(`${__dirname}/out/users_${new Date().toISOString().slice(0,10)}.csv`, csvOut)
}

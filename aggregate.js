const { ethers } = require("ethers")
const { BigNumber, utils, constants, providers, Contract } = ethers
const { parseEther, formatEther } = utils
const fetch = require('node-fetch')
const jsonexport = require('jsonexport')
const fs = require("fs")
const Promise = require("bluebird")
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
  let distributions = await Promise.all(events.map(async (e)=>{
    const id = e.args.id.toNumber()
    let hash
    if(id === 25)
      hash = "Qmb6WgJyM9DVb4qHwsEHe1SbgaPUPTxvzyRxQMDxGmutKz"
    else
      hash = (await airdrop.airdrops(id)).dataURI.replace("ipfs:","")
    const distribution = await (await fetch(`https://ipfs.io/ipfs/${hash}`)).json()
    return { id, ...distribution }
  }))
  const aggDist = {}
  await Promise.all(distributions.map(async ({id, root, awards})=>{
    await Promise.all(awards.map(async ({address, amount0, amount1, username})=>{
      address = address.toLowerCase()
      const awarded = await airdrop.awarded(id, address)
      console.log(`${id} ${address} ${formatEther(amount0)} ${awarded}`)
      if(!awarded){
        if(!aggDist[address]) aggDist[address] = { username, blockchain_address: address, contrib: 0, donut: 0 }
        aggDist[address].contrib += parseInt(formatEther(amount0))
        aggDist[address].donut += parseInt(formatEther(amount1))
      }
    }))
  }))
  const csvOut = await jsonexport(Object.values(aggDist))
  fs.writeFileSync(`${__dirname}/in/aggDist_${new Date().toISOString().slice(0,10)}.csv`, csvOut)
}

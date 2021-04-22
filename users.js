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
const MerkleTwoDropABI = require("./abi/MerkleTwoDropABI")
const airdrop = new ethers.Contract(process.env.AIRDROP_ADDRESS, MerkleTwoDropABI, provider)
const currentUsers = require("./docs/users").reduce((p,{username,address})=>{p[username]={username,address};return p;},{})
let hashes = {
  "0x1c034aed470bc1e7ed69f9e751b147d23a1470e95c3c28ff8a795617bf881840": "QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu", // aggDist
  "0xd16105af9df8954f03626c3ebb74b0f8e7baf8fd0ab27a311b8b18f8874d2f4f": "QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2"  // round_96
}

main()

async function main(){
  let events = await airdrop.queryFilter(airdrop.filters.Start())
  let airdrops = await Promise.all(events.map(async (e)=>{
    const id = e.args.id.toNumber()
    const root = await airdrop.airdrops(id)
    const hash = hashes[root]
    console.log(id, root, hash)
    // const hash = (await airdrop.airdrops(id)).dataURI.replace("ipfs:","")
    const {awards} = await (await fetch(`https://ipfs.io/ipfs/${hash}`)).json()
    return awards
  }))
  let users = airdrops.reduce((p,airdrop)=>{
    const re = new RegExp('^u/');
    airdrop.forEach(award=>{
      if(award.username){
        const username = award.username.replace(re,"")
        p[username]={username, address: award.address}
      }
    })
    return p
  },{})
  users = {...currentUsers, ...users}
  console.log(Object.keys(users).length)
  const newFileNameBase = `${__dirname}/out/users_${new Date().toISOString().slice(0,10)}`
  fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(Object.values(users), null, 2))
  // fs.unlinkSync(`${__dirname}/out/users.json`)
  fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/users.json`)
  // fs.symlinkSync(`${newFileNameBase}.json`, `${__dirname}/out/users.json`)
  const csvOut = await jsonexport(Object.values(users))
  fs.writeFileSync(`${newFileNameBase}.csv`, csvOut)
}

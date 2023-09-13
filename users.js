import { ethers } from "ethers"
import path from 'path';
import { fileURLToPath } from 'url';

// const { ethers } = require("ethers")
const { constants, providers, Contract, getDefaultProvider } = ethers
const { env } = process
const { WeiPerEther } = constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import fetch from "node-fetch"
// const fetch = require('node-fetch')
import jsonexport from "jsonexport"
// const jsonexport = require('jsonexport')
import fs from "fs"
// const fs = require("fs")
import Promise from "bluebird"
// const Promise = require("bluebird")

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const mainnet = new getDefaultProvider('mainnet', {
  alchemy: env.ALCHEMY_API,
  infura: {
    projectId: env.INFURA_PROJECT_ID,
    projectSecret: env.INFURA_PROJECT_SECRET
  }
})

// const XDAI_JSON_RPC = "https://xdai.poanetwork.dev"
// const XDAI_JSON_RPC = "http://127.0.0.1:8545/"
const XDAI_JSON_RPC = "https://rpc.gnosischain.com"
// const xdai = new providers.WebSocketProvider("wss://rpc.xdaichain.com/wss")
const xdai = new providers.JsonRpcProvider(XDAI_JSON_RPC)

const MerkleTwoDropABI = JSON.parse(fs.readFileSync('./abi/MerkleTwoDropABI.json'));
// const MerkleTwoDropABI = require("./abi/MerkleTwoDropABI")
const ERC20 = JSON.parse(fs.readFileSync('./abi/ERC20.json'));
// const ERC20 = require("./abi/ERC20")
const Staking = JSON.parse(fs.readFileSync('./abi/Staking.json'));
// const Staking = require("./abi/Staking")

const UniToken = ERC20.concat(["function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)"]);
const airdropInstance = new Contract(env.AIRDROP_ADDRESS, MerkleTwoDropABI, mainnet)
const contribInstance = new Contract(env.CONTRIB_ADDRESS, ERC20, xdai)
const donutMainnetInstance = new Contract(env.DONUT_MAINNET_ADDRESS, ERC20, mainnet)
const donutXDaiInstance = new Contract(env.DONUT_XDAI_ADDRESS, ERC20, xdai)
const stakingMainnetInstance = new Contract(env.STAKING_MAINNET_ADDRESS, Staking, mainnet)
const lpMainnetInstance = new Contract(env.LP_MAINNET_ADDRESS, UniToken, mainnet)
const stakingXDaiInstance = new Contract(env.STAKING_XDAI_ADDRESS, Staking, xdai)
const lpXDaiInstance = new Contract(env.LP_XDAI_ADDRESS, UniToken, xdai)

const currentUsers = JSON.parse(fs.readFileSync('./docs/users.json')).reduce((p,{username,address})=>{p[username]={username,address};return p;},{})


let hashes = [
  "QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu", // aggDist
  "QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2", // round_96
  "QmWXyT6zRod9tHsoi9wvMaqVdJAvRhXKwuEXuTCjx44Rrd", // round_97
  "QmW7Tr1dVVfqUGMAFeEinHRkSCRumirNwJdLbbHj2YfwDv", // round_98
  "QmNwPTHUTCiw6B2nq6jZfd13vrxtGkKJYqq9to4nQZACU1", // round_99
  "QmVESP61B4NwWvqQqtVdjyNLG62a6ryUK7LrwMJK45TTBq", // round_100
  "QmawS3Q117PNppt2SQHcfFKii2wGpGFh8wPpA4AhwmL6qx", // round_101
  "QmedigsXvwVXKQMkr3X2y1jxdUMKnPtXoAq4wBkgetnwJz", // round_102
  "QmcGkH33Z2egCweCapEPiKzojQnYdL4pZGfAASqAx72mQA", // round_103
  "QmQKKzZMhE33qepK7NSmHV6pSp5PpT5uY8sfRte1GHxTnx", // round_104
  "Qmd4gC4A4gc1Ft5dQ6JHo2q7piUetyEGMqZ1cJZQCfCU3p", // round_105
  "QmWsejDYfi5wQUuXTmu4RjX7GUpSF7kM2GXHAAQHYAFnur", // round_106
  "QmZBerHmuj85KXpzaVtycMySjrnJ1MXFNBJPfnQicWkpqc", // round_107
  "QmZUKyWddQRoLk5qRectNdU8YKgttLzKhrL7e7eV7ZHtsh", // round_108
  "QmXcteXjAJ9aMvHPcCuiBmKPYsojFQ4r8u9861f3v5z5xr", // round_109
  "QmcrjPQf1fEkBvsCa32KCM2nFpwc5nwb2JYh2rDK61AbDK", // round_110
  "QmYSLVMg9LLpXrmo2EVtMQWKU6ToqsjcJNTgvVXSnPGbjF", // round_111
  "Qmb8chnctkR4SEi2A3ohqXpoUnpat65YNEDm1rpQB3Vx8t", // round_112
  "QmSMra7ymRNV4ngXXN9NHMkLPnFB1CrptQNVjCqi7ieBTg", // round_113
  "QmTfXL8AAaPkEKutBMtbm54ACPwwwzQ5q9UneAExypiw8i", // round_114
  "QmTgEA29PcuqT2X1a7qYcpRKtLCReZyGNXghMsd2tBmmzh", // round_115
  "QmeWzP7tYRqZej9rabH2EUGozpTbLQw6fUov33axhnyMQ8", // round_116
  "QmYUXCYWwetrEYEjYy1zSixEDo7ygqeqDdMBuwY9fnbpfR", // round_117
  "QmUqL7H1q7PmaPgjfWUTvg4ttF7vw5phUYniqNysBgpVxo", // round_118
  "QmYoTrbqu4xdgX4TuPdxANSCD9Rp2acZx83cFfyySSoVCn", // round_119
  "QmbTuAphoPKztEseDsDNe9FR1SYWz5AUYuMUeGCD9nVQUk", // round_120
  "QmUzS4y17MosyBLhfYvQGuvNq22gcyJZhUtwi3weCngXfr", // round_121
  "Qme6wBZJ4JpEkcrEsEA5csTX5wRZiNLxhmy4DbrJ8HmPcr", // round_122
  "QmR2HfFhHwLUWhRcvXWmd4bMgpkgGvppPUgtFBYMrtvf1C", // round_123
  "QmQnp94cqHffuyXDWrbCGC9CpoziaNNaBwMT8Fh3wibHJt", // round_124
  "QmbJtmLQZaviTsaRQThiUHZykuwckj6Q3tJafeKV9YzJG5", // round_125
  "QmVJcR8fhigBBjwgneVoWEbCZ1Xbi6UjTkf3dZ3pbQVTFe", // round_126
  "QmPRbP2djRt11U8H5j9Fsj7hR1sd6AeHK75vgnqRk3rLbA" // round_127
]

main()

async function main(){

  let airdrops = await Promise.all(hashes.map(async (e)=>{
    const hash = hashes[e]
    console.log(e)
    const {awards} = await (await fetch(`https://ipfs.io/ipfs/${e}`)).json()
    //  const {awards} = await (await fetch(`https://gateway.pinata.cloud/ipfs/${e}`)).json()
    //  const {awards} = await (await fetch(`http://127.0.0.1:8080/ipfs/${e}`)).json()
    return {hash, awards}

  }))

  let usersMap = airdrops.reduce((p,airdrop)=>{
    const re = new RegExp('^u/');
    airdrop.awards.forEach(award=>{
      if(award.username){
        const username = award.username.replace(re,"")
        p[username]={username, address: award.address}
      }
    })
    return p
  },{})


  let lpMainnetSupply = await lpMainnetInstance.totalSupply();
  let stakingMainnetSupply = await stakingMainnetInstance.totalSupply();
  let [donutsInMainnetUniswap, ethInUniswap, _1] = await lpMainnetInstance.getReserves();
  let lpXDaiSupply = await lpXDaiInstance.totalSupply();
  let stakingXDaiSupply = await stakingXDaiInstance.totalSupply();
  let [donutsInXDaiUniswap, wxdaiInUniswap, _2] = await lpXDaiInstance.getReserves();

  let mainnetMultiplier = donutsInMainnetUniswap.div(lpMainnetSupply)
  let xdaiMultiplier = donutsInXDaiUniswap.div(lpXDaiSupply)

  usersMap = {...currentUsers, ...usersMap}
  let users = Object.values(usersMap)
  users = await Promise.mapSeries(users, getBalances(mainnetMultiplier, xdaiMultiplier))
  console.log(users.length)
  const newFileNameBase = `${__dirname}/out/users_${new Date().toISOString().slice(0,10)}`
  fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(users, null, 2))
  fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/users.json`)
  const csvOut = await jsonexport(users)
  fs.writeFileSync(`${newFileNameBase}.csv`, csvOut)
}


function getBalances(mainnetMultiplier, xdaiMultiplier){
  return async function(user){
    let numTries = 10;
    let counter = ""
    while (true) {
      try {
        let contribBal = await contribInstance.balanceOf(user.address)
        let donutBal = await donutMainnetInstance.balanceOf(user.address)
        let donutXDaiBal = await donutXDaiInstance.balanceOf(user.address)

        let stakedMainnetBal = (await stakingMainnetInstance.balanceOf(user.address)).mul(mainnetMultiplier)
        if(stakedMainnetBal.gt(0)) {console.log(user.username, stakedMainnetBal.div(WeiPerEther).toString(), "mainnet")}
        let stakedXDaiBal = (await stakingXDaiInstance.balanceOf(user.address)).mul(xdaiMultiplier)
        if(stakedXDaiBal.gt(0)) console.log(user.username, stakedXDaiBal.div(WeiPerEther).toString(), "xdai")

        donutBal = donutBal.add(donutXDaiBal).add(stakedMainnetBal).add(stakedXDaiBal)

        user.contrib = contribBal.div(WeiPerEther).toString()
        user.donut = donutBal.div(WeiPerEther).toString()
        user.weight = donutBal.lt(contribBal) ? donutBal.div(WeiPerEther).toString() : contribBal.div(WeiPerEther).toString()

        console.log(user.username, user.contrib, user.donut, user.weight)

        return user
      } catch ( e ) {
        if(--numTries < 1) {
          console.log("Giving Up")
          throw e
        } else {
          counter = counter + "."
          console.log(counter)
	        await wait(1000)
        }
      }
    }
  }
}

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
const contribInstance = new Contract(env.CONTRIB_ADDRESS, ERC20, mainnet)
const donutMainnetInstance = new Contract(env.DONUT_MAINNET_ADDRESS, ERC20, mainnet)
const donutXDaiInstance = new Contract(env.DONUT_XDAI_ADDRESS, ERC20, xdai)
const stakingMainnetInstance = new Contract(env.STAKING_MAINNET_ADDRESS, Staking, mainnet)
const lpMainnetInstance = new Contract(env.LP_MAINNET_ADDRESS, UniToken, mainnet)
const stakingXDaiInstance = new Contract(env.STAKING_XDAI_ADDRESS, Staking, xdai)
const lpXDaiInstance = new Contract(env.LP_XDAI_ADDRESS, UniToken, xdai)

const currentUsers = JSON.parse(fs.readFileSync('./docs/users.json')).reduce((p,{username,address})=>{p[username]={username,address};return p;},{})
// const currentUsers = require("./docs/users")

// let hashes = {
//   "0x1c034aed470bc1e7ed69f9e751b147d23a1470e95c3c28ff8a795617bf881840": "QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu", // aggDist
//   "0xd16105af9df8954f03626c3ebb74b0f8e7baf8fd0ab27a311b8b18f8874d2f4f": "QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2", // round_96
//   "0x80ad7c3838aeec599c2882e0e4002d3d1840c3981cf63bc9a55c735e94fec79b": "QmWXyT6zRod9tHsoi9wvMaqVdJAvRhXKwuEXuTCjx44Rrd", // round_97
//   "0x2504597d143a4e2c6453860311c5bf0dc1b930a92db0718443eb5905d1d0e091": "QmW7Tr1dVVfqUGMAFeEinHRkSCRumirNwJdLbbHj2YfwDv", // round_98
//   "0x6cb9402ccf826bd6cedcb4d98a72dc527ee862ca8bec292f0f0e030af8b69972": "QmNwPTHUTCiw6B2nq6jZfd13vrxtGkKJYqq9to4nQZACU1", // round_99
//   "0x4b3d3769e1e640fc68c9ec97cc393562887f7d4f1ff8b1c2784af80a1ca7ba8a": "QmVESP61B4NwWvqQqtVdjyNLG62a6ryUK7LrwMJK45TTBq", // round_100
//   "0xc7ae82b5a66c994317b8cb2f07b89a975510e7941536478ac656f0843e9818b3": "QmawS3Q117PNppt2SQHcfFKii2wGpGFh8wPpA4AhwmL6qx", // round_101
//   "0x4934cf7ec01671ead9c3355a8c9cc202f611b275d5f4d9ff27adb9bff560858f": "QmedigsXvwVXKQMkr3X2y1jxdUMKnPtXoAq4wBkgetnwJz", // round_102
//   "0x2b9c711c4457dd4444f28f8828779a3b52f2d6cb7d0a1e6d5635b08df03a5d4f": "QmcGkH33Z2egCweCapEPiKzojQnYdL4pZGfAASqAx72mQA", // round_103
//   "0x11f394d28e9be1fbcecfd5634e9ec3c9d5cc4d34b080dce287d18955fc16e56d": "QmQKKzZMhE33qepK7NSmHV6pSp5PpT5uY8sfRte1GHxTnx", // round_104
//   "0xc0b481fb196e02717e3d2d25317ec23a61f2717a98029bb6fbc172e9aceae062": "Qmd4gC4A4gc1Ft5dQ6JHo2q7piUetyEGMqZ1cJZQCfCU3p", // round_105
//   "0xaa9cd7362326630d89431168989d2b3bc0103008bb9b592814832109169dd403": "QmWsejDYfi5wQUuXTmu4RjX7GUpSF7kM2GXHAAQHYAFnur", // round_106
//   "0x984662dc697fd17ffd5f26887840c486b9a21d872b69b45c5c1f79d4386efd2b": "QmZBerHmuj85KXpzaVtycMySjrnJ1MXFNBJPfnQicWkpqc", // round_107
//   "0x9c3f919e05fac64b74bd6c8e4f503d5495d92a10ed723757ad7bf1766450f8ae": "QmZUKyWddQRoLk5qRectNdU8YKgttLzKhrL7e7eV7ZHtsh", // round_108
//   "0xaa43f818e46f2c0f0348876a7d46563644878dd076ec7a5d0aee2d2af346022c": "QmXcteXjAJ9aMvHPcCuiBmKPYsojFQ4r8u9861f3v5z5xr", // round_109
//   "0x9fe9c612cbc5765f95e0145462c19126a779a645f665ddd48a3329f2d019d8a8": "QmcrjPQf1fEkBvsCa32KCM2nFpwc5nwb2JYh2rDK61AbDK", // round_110
//   "0x3cfbd84fc1aec1ee1482059efee4968078f1aa37798480e7f31165ac17b15b18": "QmYSLVMg9LLpXrmo2EVtMQWKU6ToqsjcJNTgvVXSnPGbjF", // round_111
//   "0x2580af891b9cab9a4aead5328ba762a93f1efaae5f225427aa0f6c480db03784": "Qmb8chnctkR4SEi2A3ohqXpoUnpat65YNEDm1rpQB3Vx8t", // round_112
//   "0xffb113bf364c92d61e05b174284154e6b41d9b76fb78310a9470ffbd34b11bb4": "QmSMra7ymRNV4ngXXN9NHMkLPnFB1CrptQNVjCqi7ieBTg", // round_113
//   "0x0cd0fc9aa519d4cddbd144ad4c5692ca2c4164cdc75ff08ef4e59b3277513616": "QmTfXL8AAaPkEKutBMtbm54ACPwwwzQ5q9UneAExypiw8i", // round_114
//   "0x21b497666281ea712105f66a1f3131078d3b8903f6fec495d65a2ad339c83144": "QmTgEA29PcuqT2X1a7qYcpRKtLCReZyGNXghMsd2tBmmzh", // round_115
//   "0x2f1981dde833672b38964dce06bd364feff27cf1ae4003b42d2cdbfa28a8c80b": "QmeWzP7tYRqZej9rabH2EUGozpTbLQw6fUov33axhnyMQ8" // round_116
// }

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
  "QmeWzP7tYRqZej9rabH2EUGozpTbLQw6fUov33axhnyMQ8" // round_116
]


main()

async function main(){
  /* 
  The following section uses mainnet block history to create the user list by searching for the "Start()" transaction at the distribution address.
  */
  // let events = await airdropInstance.queryFilter(airdropInstance.filters.Start())
  // let airdrops = await Promise.all(events.map(async (e)=>{
  //   const id = e.args.id.toNumber()
  //   const root = await airdropInstance.airdrops(id)
  //   const hash = hashes[root]
  //   console.log(id, root, hash)
  //   const {awards} = await (await fetch(`https://ipfs.io/ipfs/${hash}`)).json()
  //   return {id, root, hash, awards}
  // }))

  /* 
  This method uses the hashes listed above. 
  */

  let airdrops = await Promise.all(hashes.map(async (e)=>{
    const hash = hashes[e]
    console.log(e, `https://ipfs.io/ipfs/${e}`)
    const {awards} = await (await fetch(`https://ipfs.io/ipfs/${e}`)).json()
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
  users = await Promise.mapSeries(users, getBalances(airdrops, mainnetMultiplier, xdaiMultiplier))
  console.log(users.length)
  const newFileNameBase = `${__dirname}/out/users_${new Date().toISOString().slice(0,10)}`
  fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(users, null, 2))
  // fs.unlinkSync(`${__dirname}/out/users.json`)
  fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/users.json`)
  // fs.symlinkSync(`${newFileNameBase}.json`, `${__dirname}/out/users.json`)
  const csvOut = await jsonexport(users)
  fs.writeFileSync(`${newFileNameBase}.csv`, csvOut)
}

// + mainnet contrib
// + aggDist contrib if aggDist not claimed
// + each round contrib if not claimed

function getBalances(airdrops, mainnetMultiplier, xdaiMultiplier){
  return async function(user){
    let contribBal = await contribInstance.balanceOf(user.address)
    let donutBal = await donutMainnetInstance.balanceOf(user.address)
    let donutXDaiBal = await donutXDaiInstance.balanceOf(user.address)

    let stakedMainnetBal = (await stakingMainnetInstance.balanceOf(user.address)).mul(mainnetMultiplier)
    if(stakedMainnetBal.gt(0)) {console.log(user.username, stakedMainnetBal.div(WeiPerEther).toString(), "mainnet")}
    let stakedXDaiBal = (await stakingXDaiInstance.balanceOf(user.address)).mul(xdaiMultiplier)
    if(stakedXDaiBal.gt(0)) console.log(user.username, stakedXDaiBal.div(WeiPerEther).toString(), "xdai")

    donutBal = donutBal.add(donutXDaiBal).add(stakedMainnetBal).add(stakedXDaiBal)

    const earned = airdrops.filter((airdrop)=>airdrop.awards.find(a=>a.address.toLowerCase()===user.address.toLowerCase()))
    await Promise.all(earned.map(async (airdrop)=>{
      const awarded = await airdropInstance.awarded(airdrop.id, user.address)
      if(awarded) return
      else {
        const award = airdrop.awards.find(a=>a.address.toLowerCase()===user.address.toLowerCase())
        contribBal = contribBal.add(award.amount0)
        donutBal = donutBal.add(award.amount1)
      }
    }))

    user.contrib = contribBal.div(WeiPerEther).toString()
    user.donut = donutBal.div(WeiPerEther).toString()
    user.weight = donutBal.lt(contribBal) ? donutBal.div(WeiPerEther).toString() : contribBal.div(WeiPerEther).toString()

    console.log(user.username, user.contrib, user.donut, user.weight)

    return user
  }
}

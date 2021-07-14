const { ethers } = require("ethers")
const { constants, providers, Contract, getDefaultProvider } = ethers
const { env } = process
const { WeiPerEther } = constants
const fetch = require('node-fetch')
const jsonexport = require('jsonexport')
const fs = require("fs")
const Promise = require("bluebird")
const mainnet = new getDefaultProvider('mainnet', {
  alchemy: env.ALCHEMY_API,
  infura: {
    projectId: env.INFURA_PROJECT_ID,
    projectSecret: env.INFURA_PROJECT_SECRET
  }
})
const xdai = new providers.JsonRpcProvider("https://dai.poa.network")

const MerkleTwoDropABI = require("./abi/MerkleTwoDropABI")
const ERC20 = require("./abi/ERC20")
const Staking = require("./abi/Staking")
const UniToken = ERC20.concat(["function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)"]);
const airdropInstance = new Contract(env.AIRDROP_ADDRESS, MerkleTwoDropABI, mainnet)
const contribInstance = new Contract(env.CONTRIB_ADDRESS, ERC20, mainnet)
const donutMainnetInstance = new Contract(env.DONUT_MAINNET_ADDRESS, ERC20, mainnet)
const donutXDaiInstance = new Contract(env.DONUT_XDAI_ADDRESS, ERC20, xdai)
const stakingMainnetInstance = new Contract(env.STAKING_MAINNET_ADDRESS, Staking, mainnet)
const lpMainnetInstance = new Contract(env.LP_MAINNET_ADDRESS, UniToken, mainnet)
const stakingXDaiInstance = new Contract(env.STAKING_XDAI_ADDRESS, Staking, xdai)
const lpXDaiInstance = new Contract(env.LP_XDAI_ADDRESS, UniToken, xdai)
const currentUsers = require("./docs/users").reduce((p,{username,address})=>{p[username]={username,address};return p;},{})
let hashes = {
  "0x1c034aed470bc1e7ed69f9e751b147d23a1470e95c3c28ff8a795617bf881840": "QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu", // aggDist
  "0xd16105af9df8954f03626c3ebb74b0f8e7baf8fd0ab27a311b8b18f8874d2f4f": "QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2", // round_96
  "0x80ad7c3838aeec599c2882e0e4002d3d1840c3981cf63bc9a55c735e94fec79b": "QmWXyT6zRod9tHsoi9wvMaqVdJAvRhXKwuEXuTCjx44Rrd", // round_97
  "0x2504597d143a4e2c6453860311c5bf0dc1b930a92db0718443eb5905d1d0e091": "QmW7Tr1dVVfqUGMAFeEinHRkSCRumirNwJdLbbHj2YfwDv",  // round_98
  "0x6cb9402ccf826bd6cedcb4d98a72dc527ee862ca8bec292f0f0e030af8b69972": "QmNwPTHUTCiw6B2nq6jZfd13vrxtGkKJYqq9to4nQZACU1"  // round_99
}

main()

async function main(){
  let events = await airdropInstance.queryFilter(airdropInstance.filters.Start())
  let airdrops = await Promise.all(events.map(async (e)=>{
    const id = e.args.id.toNumber()
    const root = await airdropInstance.airdrops(id)
    const hash = hashes[root]
    console.log(id, root, hash)
    const {awards} = await (await fetch(`https://ipfs.io/ipfs/${hash}`)).json()
    return {id, root, hash, awards}
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

    let stakedMainnetBal = await stakingMainnetInstance.balanceOf(user.address)
    if(stakedMainnetBal.gt(0)) console.log(user.username, stakedMainnetBal.mul(mainnetMultiplier).div(WeiPerEther).toString(), "mainnet")
    let stakedXDaiBal = await stakingXDaiInstance.balanceOf(user.address)
    if(stakedXDaiBal.gt(0)) console.log(user.username, stakedXDaiBal.mul(xdaiMultiplier).div(WeiPerEther).toString(), "xdai")
    
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

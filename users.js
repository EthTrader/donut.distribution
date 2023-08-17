import { ethers } from "ethers"
import path from 'path';
import { fileURLToPath } from 'url';
import jsonexport from "jsonexport"
import fs from "fs"
import Promise from "bluebird"

const { constants, providers, Contract, getDefaultProvider } = ethers
const { env } = process
const { WeiPerEther } = constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
const ERC20 = JSON.parse(fs.readFileSync('./abi/ERC20.json'));
const Staking = JSON.parse(fs.readFileSync('./abi/Staking.json'));

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

main()

async function main(){
  let lpMainnetSupply = await lpMainnetInstance.totalSupply();
  let stakingMainnetSupply = await stakingMainnetInstance.totalSupply();
  let [donutsInMainnetUniswap, ethInUniswap, _1] = await lpMainnetInstance.getReserves();
  let lpXDaiSupply = await lpXDaiInstance.totalSupply();
  let stakingXDaiSupply = await stakingXDaiInstance.totalSupply();
  let [donutsInXDaiUniswap, wxdaiInUniswap, _2] = await lpXDaiInstance.getReserves();

  let mainnetMultiplier = donutsInMainnetUniswap.div(lpMainnetSupply)
  let xdaiMultiplier = donutsInXDaiUniswap.div(lpXDaiSupply)

  let users = Object.values(currentUsers)
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
    let numTries = 5;
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
	        await wait(500)
        }
      }
    }
  }
}

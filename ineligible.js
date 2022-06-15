import Promise from "bluebird"
import snoowrap from "snoowrap"
import csv from "csvtojson"
import jsonexport from "jsonexport"
import fs from "fs"
import ipfsClient from "ipfs-http-client"
import fetch from "node-fetch"
import merklize from "./merklize.js"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inactive = []

const LABEL = `round_111`
const FILE = `${LABEL}.csv`
const DATE = Math.floor(Date.now() / 1000) - 5184000

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
    const removedUsers = (await reddit.getSubreddit('ethtrader').getBannedUsers({limit: Infinity}).map(({ name }) => name))
    
    /* 
    If we need to fetch the entire Users list uncomment both lines below
    Processing via Reddit API will take quite a long time. 
    */

    // const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())
    // const names = users.map(({ username }) => username)
    
    const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)    
    const names = distributionCSV.map(({ username }) => username.replace(new RegExp('^u/'),""))

    const inactiveUsers = await Promise.mapSeries(names, invalidAccount)
    const ineligbleNames = [...removedUsers, ...inactiveUsers].filter(e => e)

    console.log(`ineligble names: ${ineligbleNames.join(', ')}`)

    const newFileNameBase = `${__dirname}/out/ineligible_${new Date().toISOString().slice(0,10)}`
    fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(ineligbleNames, null, 2))
    fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/ineligible.json`)
    const csvOut = await jsonexport(ineligbleNames)
    fs.writeFileSync(`${newFileNameBase}.csv`, csvOut)
}

async function invalidAccount(name){
  await wait(2500)
  if(name == "[deleted]") return name
  let user, newUser, newPoster
  try {
    console.log(`checking ${name}`)
    user = await reddit.getUser(name).fetch()
    if(user.link_karma < 1000) {
      newPoster = true
    } else if (user.created > DATE) {
      newUser = true
    }
  } catch(e){
    console.log(e)
  }
  if(!user || user.is_suspended || newUser || newPoster) return name
  else return null
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

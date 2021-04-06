const aggregation = require("./out/aggDist_2021-03-29_l2.QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu.json")
const round_95 = require("./out/round_95_l2.Qmac3maSpPLV5BF9sHvkNV41LWdZrCtHHDshcXH8iuhuvw.json")
const fs = require("fs")

let total = 0


const adjusted = aggregation.map(award=>{
  let {address,donut} = award
  const awarded = round_95.find(a=>a.address.toLowerCase()===address.toLowerCase())
  if(awarded){
    donut -= awarded.donut
  }

  total += donut
  return {...award, donut}
}).filter(({donut})=>!!donut)

console.log(round_95.filter(({username})=>!aggregation.find(a=>a.username==username)))
// console.log(adjusted)

console.log(aggregation.length, adjusted.length, round_95.length)
console.log(aggregation.reduce((prev, {donut})=>(prev+donut),0))
console.log(round_95.reduce((prev, {donut})=>(prev+donut),0))
console.log(adjusted.reduce((prev, {donut})=>(prev+donut),0))
console.log(total)


fs.writeFileSync( `${__dirname}/out/aggFix_l2.${(new Date()).toISOString().slice(0,10)}.json`, JSON.stringify(adjusted))

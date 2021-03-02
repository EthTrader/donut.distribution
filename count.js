const recipients = require("./out/round_94_l2.QmedzXbevX9cnP6njLFxHMA7D8BsPN9gDebYJU1wDytPQW.json")

let sum = recipients.reduce((p,c)=>{
  p += c.donut
  return p
},0)

console.log(sum)

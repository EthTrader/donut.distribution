const fs = require("fs")

const users = require("./docs/users").map(({username, address,weight})=>(
  {address, weight: parseInt(weight) > 10000 ? parseInt(weight) : 10000}
))

fs.writeFileSync(`${__dirname}/docs/finance.vote.json`, JSON.stringify(users, null, 2))

so the new distribution was published https://old.reddit.com/r/ethtrader/comments/ms96el/new_donuts_distribution/
i'm going to walk through the steps that i do here:
1. start ipfs with `ipfs daemon` if it's not already running
2. have https://github.com/EthTrader/donut.distribution cloned and `yarn` etc.
3. have your own `.env` saved in `donut.distribution`  that sets following:
```
export REDDIT_SCRIPT_CLIENT_ID=
export REDDIT_SCRIPT_CLIENT_SECRET=
export REDDIT_USERNAME=
export REDDIT_PASSWORD=
export AIRDROP_ADDRESS=0xEbE1645A82ecEfA9375F6E329f5ce664864981FA
export INFURA_PROJECT_ID=
export INFURA_PROJECT_SECRET=
export ALCHEMY_API=
```
4. download https://reddit-meta-production.s3.amazonaws.com/distribution/publish/ethtrader/round_96.csv to `donut.distribution/in`
5. `index.js` line 8. change to the new .csv filename (`round_96.csv`) in this case
6. `yarn start`. this will output some stuff including the merkle `root` and below it the ipfs hash. a bunch of new files also now in `out/`.
7. manually add the ipfs hash to pinata.cloud to pin
8. check that the distribution will load up on ipfs: for this one, https://ipfs.io/ipfs/QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2
9. `New transaction` on the gnosis multisig https://gnosis-safe.io/app/#/safes/0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E/transactions
10. Contract interaction ->
11. paste Merkle distributor contract address `0xEbE1645A82ecEfA9375F6E329f5ce664864981FA`
12. select `start` as method
13. paste the merkle root generated above, for this distribution, `0xd16105af9df8954f03626c3ebb74b0f8e7baf8fd0ab27a311b8b18f8874d2f4f`
14. complete and add to signing queue

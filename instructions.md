so the new distribution was published https://old.reddit.com/r/ethtrader/comments/ms96el/new_donuts_distribution/
i'm going to walk through the steps that i do here:

## Step 1: Run Distribution Scripts
0. Make sure the latest round to tipping totals has been updated in the [community-mod repo](https://github.com/EthTrader/community-mod/tree/main/docs). The file is saved in `docs/` as `donut_upvote_rewards_round_XXX.json`
1. Start ipfs with `ipfs daemon` if it's not already running
2. Have https://github.com/EthTrader/donut.distribution cloned and `yarn` etc.
3. Have your own `.env` saved in root `donut.distribution` folder that sets following:
    ```
    export REDDIT_SCRIPT_CLIENT_ID=
    export REDDIT_SCRIPT_CLIENT_SECRET=
    export REDDIT_USERNAME=
    export REDDIT_PASSWORD=
    export AIRDROP_ADDRESS=0xEbE1645A82ecEfA9375F6E329f5ce664864981FA
    export CONTRIB_ADDRESS=0xbe1fffB262a2C3e65c5eb90f93caf4eDC7d28c8d
    export DONUT_MAINNET_ADDRESS=0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9
    export DONUT_XDAI_ADDRESS=0x524B969793a64a602342d89BC2789D43a016B13A
    export LP_MAINNET_ADDRESS=0x718Dd8B743ea19d71BDb4Cb48BB984b73a65cE06
    export LP_XDAI_ADDRESS=0x077240a400b1740C8cD6f73DEa37DA1F703D8c00
    export STAKING_MAINNET_ADDRESS=0x813fd5A7B6f6d792Bf9c03BBF02Ec3F08C9f98B2
    export STAKING_XDAI_ADDRESS=0x84b427415A23bFB57Eb94a0dB6a818EB63E2429D
    export INFURA_PROJECT_ID=
    export INFURA_PROJECT_SECRET=
    export ALCHEMY_API=
    ```
4. Download https://reddit-meta-production.s3.amazonaws.com/distribution/publish/ethtrader/round_104.csv to `donut.distribution/in`
5. `index.js` line 16. Change to the new round number (`round_104.csv`) in this case
6. `yarn start`. This will output some stuff including the merkle `root` and below it the ipfs hash. a bunch of new files also now in `out/`.
7. Share on discord for verification

## Step 2: Initiate Mainnet Multisig 'Start' Transaction
1. Manually add the ipfs hash to pinata.cloud to pin
2. Check that the distribution will load up on ipfs: for this one, https://ipfs.io/ipfs/QmYB4LQFcMjuCkd7tLKUtjEnW29vM9qtiuW9RAExZWcmz2
3. `New transaction` on the gnosis multisig https://gnosis-safe.io/app/#/safes/0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E/transactions
4. Contract interaction ->
    - paste Merkle distributor contract address `0xEbE1645A82ecEfA9375F6E329f5ce664864981FA`
    - select `start` as method
    - paste the merkle root generated above, for this distribution, `0xd16105af9df8954f03626c3ebb74b0f8e7baf8fd0ab27a311b8b18f8874d2f4f`
5. Complete and add to signing queue

## Step 3: Receive Donuts on Behalf of DonutMultisig
1. Use etherescan to `award` to the [mainnet multisig](https://gnosis-safe.io/app/#/safes/0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E)
2. https://etherscan.io/address/0xEbE1645A82ecEfA9375F6E329f5ce664864981FA#writeContract
3. Contract interaction ->
    - ID: `10`  //round_104 id. Previous ID can be found in the prior `start` transaction on etherscan under 'Logs'
    - _recipient (address): `0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E` //mainnet multisg gnosis-safe
    - _amount0 (uint256): `0` //no contrib claimed for bridging
    - _amount1 (uint256): `2950780000000000000000000` //round_104 total under DonutMultisig
    - _proof (bytes32[]):                             //round_104 proof under DonutMultisig, remove quotes and brackets, leave commas
    ```
    0xf2d0746163a242bcff8ceb1bb1142e6421c212d11fc7451c06824eda31ace8de,0xf7e2391a88bb014ca9e7b537acc3401d8f81da29a61e6f72047ce5e7d1f35b6f,0x5aca7ea7c1e8db7ef813d6aba9d661fe23b62d992d2a9ae5584fca0c38a509b1,0xb620d5ffbe20b168a2465bbf392d364f4ed8f71dc04d54adfc357d9302487624,0x9b1cde5dfa636cbec313c5e3dbedc8e86c43ba56e5e3e75bba72ee1c79d3ce83,0xd05e13fba56fb70b09e9a0c577cc6a1ecc8a83635c58cebac2eae6f051f824f2,0xf97393a1bb70a5836b40d107d49a4f3e59d9175aaab542b826e152ba79954953,0xcdf17d0197f0545c91a251b9281b5cbed78758bc1f515fa8bd4b14f5f615a926,0x7adbc05069175c4e4076b17e15b52ad1069367edc999ded9a7b0cdcee2f15bdf
    ``` 
4. Complete and add to signing queue

## Step 4: Initiate Mainnet Multisig to Relay Donuts to xDai Multisig
1. Initiate a `new transaction` on the gnosis multisig https://gnosis-safe.io/app/#/safes/0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E/transactions
2. The Omnibridge uses a proxy contract so the correct methods don't show up automatically. But you can get the correct abi from etherscan. Go to the Omnibridge contracts page on etherscan and look up the output for [implementation](https://etherscan.io/address/0x88ad09518695c6c3712AC10a214bE5109a655671#readContract). Or use this shortcut to the implementation contract: https://etherscan.io/address/0x8eb3b7d8498a6716904577b2579e1c313d48e347
3. Grab the Contract ABI from the code tab and paste into the ABI on gnosis multisig transaction creation. Then the drop-down for methods will change. There will be two methods called relayTokens, use whichever one asks for three inputs (usually the first one). 
4. Contract interaction ->
    - Contract:  `0x88ad09518695c6c3712AC10a214bE5109a655671`               //omnibridge contact (not the implementation proxy contract)
    - ABI: `[{[{"inputs":[{"internalType":"string","name":"_suffix"...}]`   //grab from the implementation proxy contract
    - Method: `relayTokens`                                                 //with 3 options
    - Token Address: `0xc0f9bd5fa5698b6505f643900ffa515ea5df54a9`           //mainnet Donuts address
    - Receiver Address: `0x682b5664C2b9a6a93749f2159F95c23fEd654F0A`        //xdai gnosis safe
    - Value: `2950780000000000000000000`                                    //same as DonutMultisig claim
5. Complete and add to signing queue
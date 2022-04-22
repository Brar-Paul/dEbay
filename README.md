# dEbay: Decentralized NFT Auction 

dEbay is a decentralized NFT auction site that allows users to list their already minted NFTs to be offered 
on auction. Users can set their reserve price, starting price, and auction length (in days). The auction takes 
Wrapper Ether (wETH) as payment and charges a fee percentage based on sale price. The fee percentage is set during contract deployment (deployed example is set to 2% fee) and the fee account is the account of the user that deployed the contract. 

It works on an approval system that does not take payment with each bid. Rather, 
the user approves the auction contract to spend their wETH in the amount of the bid. Once the auction is closed then
the bid amount is transfered from buyer to seller (minus the fee that is sent to feeAccount)

To run, clone this repository, install NPM dependencies, add .env file with wallet private key (rinkeby testnet).

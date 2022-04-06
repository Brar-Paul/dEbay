from brownie import Marketplace, WETH, NFT, accounts


def deployMarketplace():
    account = accounts[0]
    weth = deployWETH()
    marketplace = Marketplace.deploy(1, weth, {"from": account})
    print(f"Marketplace deployed to {marketplace.address}")


def deployNFT():
    account = accounts[0]
    nft = NFT.deploy({"from": account})
    print(f"NFT contract deployed to {nft.address}")


def deployWETH():
    weth = WETH.deploy({"from": accounts[0]})
    return weth.address


def getAccount():
    pass


def main():
    deployMarketplace()
    deployNFT()

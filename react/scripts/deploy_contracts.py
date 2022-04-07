from brownie import Marketplace, WETH, NFT, accounts, network, config


def deployMarketplace():
    account = get_account()
    if network.show_active() == "development":
        weth = deployWETH()
    else:
        weth = "0xC778417E063141139FCE010982780140AA0CD5AB"
    marketplace = Marketplace.deploy(1, weth, {"from": account})
    print(f"Marketplace deployed to {marketplace.address}")


def deployNFT():
    account = get_account()
    nft = NFT.deploy({"from": account})
    print(f"NFT contract deployed to {nft.address}")


def deployWETH():
    weth = WETH.deploy({"from": accounts[0]})
    return weth.address


def get_account(index=None, id=None):
    if index:
        return accounts[index]
    if network.show_active() == "development":
        return accounts[0]
    if id:
        return accounts.load(id)
    return accounts.add(config["wallets"]["from_key"])


def main():
    deployMarketplace()
    deployNFT()

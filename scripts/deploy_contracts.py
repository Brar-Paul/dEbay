from brownie import Marketplace, WETH, accounts, network, config
from web3 import Web3


def deployMarketplace():
    account = get_account()
    if network.show_active() == "development":
        weth = deployWETH()
    else:
        weth = config["networks"][network.show_active()]["weth_token"]
    marketplace = Marketplace.deploy(2, weth, {"from": account}, publish_source=True)
    print(f"Marketplace deployed to {marketplace.address}")


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

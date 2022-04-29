import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import Navigation from './components/Navbar';
import Home from './components/Home.js'
import Create from './components/Create.js'
import MyListedItems from './components/MyListedItems.js'
import MyPurchases from './components/MyPurchases.js'
import helperConfig from "./helper-config.json"
import networkMapping from "./artifacts/deployments/map.json"
import { useEthers, ChainId } from "@usedapp/core"
import { useState } from 'react'
import { ethers } from "ethers"
import { Spinner } from 'react-bootstrap'
import React from 'react'
import Marketplace from './artifacts/contracts/Marketplace.json'
import { constants, utils } from 'ethers'

import './App.css';

function App() {
    const [loading, setLoading] = useState(true)
    const [account, setAccount] = useState(null)
    const [marketplace, setMarketplace] = useState({})
    // MetaMask Login/Connect
    const web3Handler = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0])
        // Get provider from Metamask
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        // Set signer
        const signer = provider.getSigner()

        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        })

        window.ethereum.on('accountsChanged', async function (accounts) {
            setAccount(accounts[0])
            await web3Handler()
        })
        loadContracts(signer, provider)
    }
    const loadContracts = async (signer, provider) => {
        // Get Address and ABI of Marketplace
        const chainId = provider.ChainId
        const { abi } = Marketplace
        const marketplaceAddress = networkMapping['4']["Marketplace"][0]
        const marketplaceInterface = new utils.Interface(abi)
        // Get deployed copies of contracts
        const marketplace = new ethers.Contract(marketplaceAddress, marketplaceInterface, signer)
        setMarketplace(marketplace)
        setLoading(false)
    }

    return (
        <BrowserRouter>
            <div className="App">
                <>
                    <Navigation web3Handler={web3Handler} account={account} />
                </>
                <div>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                            <Spinner animation="border" style={{ display: 'flex' }} />
                            <p className='mx-3 my-0'>Awaiting Metamask Connection...</p>
                        </div>
                    ) : (
                        <Routes>
                            <Route path="/dEbay" element={
                                <Home marketplace={marketplace} />
                            } />
                            <Route path="/dEbay/create" element={
                                <Create marketplace={marketplace} />
                            } />
                            <Route path="/dEbay/my-listed-items" element={
                                <MyListedItems marketplace={marketplace} account={account} />
                            } />
                            <Route path="/dEbay/my-purchases" element={
                                <MyPurchases marketplace={marketplace} account={account} />
                            } />
                        </Routes>
                    )}
                </div>
            </div>
        </BrowserRouter>

    );
}

export default App;
import React from 'react'
import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card } from 'react-bootstrap'
import { Contract } from '@ethersproject/contracts'

const moment = require('moment')

export default function MyBids({ marketplace, account }) {
    const [loading, setLoading] = useState(true)
    const [bids, setBids] = useState([])
    const loadBids = async () => {
        let listingCount = await marketplace.listingCount()
        listingCount = listingCount.toNumber()
        let bids = []
        for (let indx = 1; indx <= listingCount; indx++) {
            const i = await marketplace.listings(indx)
            if (i.buyer.toLowerCase() === account) {
                // instantiate NFT contract of listing
                const nftResponse = await fetch(`https://api-rinkeby.etherscan.io/api?module=contract&action=getabi&address=${i.nft}&apikey=DCV4PCHFIVVYWR83CS48C4J45C9IH8SV93`)
                const nftMetadata = await nftResponse.json()
                const nftAbi = nftMetadata.result
                // Get provider from Metamask
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                // Set signer
                const signer = provider.getSigner()
                const nft = new Contract(i.nft, nftAbi, signer)
                // get uri url from nft contract
                let uri = await nft.tokenURI(i.tokenId)
                uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/")
                // use uri to fetch the nft metadata stored on ipfs 
                const response = await fetch(uri)
                const metadata = await response.json()
                // format price and image 
                let currentPrice = i.currentPrice
                currentPrice = (currentPrice / (10 ** 16)) / 100
                let image = metadata.image
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                // Get Listing time and convert
                let convertedTime = moment.unix(i.closingTime)
                convertedTime = convertedTime.toString()
                // Convert AuctionState to Int
                let auctionState = i.auctionState
                auctionState = auctionState.toNumber()
                // define listed item object
                let listing = {
                    price: currentPrice,
                    listingId: i.listingId,
                    name: metadata.name,
                    description: metadata.description,
                    image: image,
                    auctionState: auctionState,
                    time: convertedTime
                }
                bids.push(listing)
            }
        }
        setLoading(false)
        setBids(bids)
    }
    useEffect(() => {
        loadBids()
    }, [])
    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
            <h2>Loading...</h2>
        </main>
    )
    return (
        <div className="flex justify-center">
            {bids.length > 0 ?
                <div className="px-5 container">
                    <h2>Your Bids</h2>
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {bids.map((listing, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={listing.image} />
                                    {Date.now() > listing.time ?
                                        <Card.Footer>
                                            <Card.Text>Current Price: {listing.price} wETH</Card.Text>
                                            <Card.Text>Time Remaining: {moment(listing.time).fromNow()}</Card.Text>
                                        </Card.Footer>
                                        :
                                        <Card.Footer>
                                            <Card.Text>Final Price: {listing.price} wETH</Card.Text>
                                            <Card.Text>You Won This Auction!</Card.Text>
                                        </Card.Footer>
                                    }
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
                : (
                    <main style={{ padding: "1rem 0" }}>
                        <h2>No Active Bids</h2>
                    </main>
                )}
        </div>
    );
}

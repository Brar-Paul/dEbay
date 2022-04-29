import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button } from 'react-bootstrap'
import React from 'react'
import { Contract } from '@ethersproject/contracts'

const moment = require('moment')


function renderSoldListings(listings) {
    return (
        <>
            <h2>Sold NFTs</h2>
            <Row xs={1} md={2} lg={4} className="g-4 py-3">
                {listings.map((listing, idx) => (
                    <Col key={idx} className="overflow-hidden">
                        <Card>
                            <Card.Img variant="top" src={listing.image} />
                            <Card.Text>For {listing.price} ETH</Card.Text>
                            <Card.Footer>
                                <Card.Text>Closed on: {moment(listing.time).format('lll')}</Card.Text>
                            </Card.Footer>
                        </Card>
                    </Col>
                ))}
            </Row>
        </>
    )
}

export default function MyListings({ marketplace, account }) {
    const [loading, setLoading] = useState(true)
    const [listings, setListings] = useState([])
    const [soldListings, setSoldListings] = useState([])

    const endAuction = async (listing) => {
        await (await marketplace.endAuction(listing.listingId)).wait()
        loadMyListings()
    }

    const cancelAuction = async (listing) => {
        await (await marketplace.cancelListing(listing.listingId)).wait()
        loadMyListings()
    }

    const loadMyListings = async () => {
        // Load all sold items that the user listed
        let listingCount = await marketplace.listingCount()
        listingCount = listingCount.toNumber()
        let allListings = []
        let soldListings = []
        for (let indx = 1; indx <= listingCount; indx++) {
            const i = await marketplace.listings(indx)
            if (i.seller.toLowerCase() === account) {
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
                let reservePrice = i.reservePrice
                reservePrice = (reservePrice / (10 ** 16)) / 100
                let image = metadata.image
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                // Get Listing time and convert
                let convertedTime = moment.unix(i.closingTime)
                //convertedTime = convertedTime.toString()
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
                    time: convertedTime,
                    reserve: reservePrice,
                    bidCount: i.bidCounter.toNumber()
                }
                allListings.push(listing)
                // Add listed item to sold items array if sold
                if (auctionState === 2) soldListings.push(listing)
            }
        }
        setLoading(false)
        setListings(allListings)
        setSoldListings(soldListings)
    }
    useEffect(() => {
        loadMyListings()
    }, [])
    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
            <h2>Loading...</h2>
        </main>
    )
    return (
        <div className="flex justify-center">
            {listings.length > 0 ?
                <div className="px-5 py-3 container">
                    <h2>Your Listed NFTs</h2>
                    <Row xs={1} md={2} lg={4} className="g-4 py-3">
                        {listings.map((listing, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                {Date.now() < listing.time ?
                                    <Card>
                                        <Card.Img variant="top" src={listing.image} />
                                        <Card.Footer>
                                            <Card.Text>Auction Running</Card.Text>
                                            <Card.Text>Current Price: {listing.price} wETH</Card.Text>
                                            <Card.Text>Closing Time: {moment(listing.time).format('lll')}</Card.Text>
                                            <Card.Text>Bid Count: {listing.bidCount}</Card.Text>
                                            <Button onClick={() => cancelAuction(listing)} variant="warning" size="sm" className='m-2'>
                                                Cancel Auction and Return NFT
                                            </Button>
                                        </Card.Footer>
                                    </Card>
                                    : listing.auctionState === 1 ?
                                        <Card>
                                            <Card.Img variant="top" src={listing.image} />
                                            <Card.Footer>
                                                <Card.Text>Auction Time Elapsed</Card.Text>
                                                <Card.Text>Final Price: {listing.price} wETH</Card.Text>
                                                <Card.Text>Bid Count: {listing.bidCount}</Card.Text>
                                                {listing.price >= listing.reserve &&
                                                    <Button onClick={() => endAuction(listing)} variant="success" size="sm" className='m-2'>
                                                        Finalize and Collect Payment
                                                    </Button>
                                                }
                                                <Button onClick={() => cancelAuction(listing)} variant="warning" size="sm" className='m-2'>
                                                    Cancel Auction and Return NFT
                                                </Button>
                                            </Card.Footer>
                                        </Card>
                                        : listing.auctionState === 3 ?
                                            <Card>
                                                <Card.Img variant="top" src={listing.image} />
                                                <Card.Footer>
                                                    <Card.Text>Auction Reverted</Card.Text>
                                                    <Card.Text>Final Price: {listing.price} wETH</Card.Text>
                                                    <Card.Text>Bid Count: {listing.bidCount}</Card.Text>
                                                    <Button onClick={() => cancelAuction(listing)} variant="warning" size="sm" className='m-2'>
                                                        Cancel Auction and Return NFT
                                                    </Button>
                                                </Card.Footer>
                                            </Card>
                                            :
                                            <Card>
                                                <Card.Img variant="top" src={listing.image} />
                                                <Card.Footer>
                                                    <Card.Text>Auction Finalized</Card.Text>
                                                    <Card.Text>Bid Count: {listing.bidCount}</Card.Text>
                                                    <Card.Text>Final Price: {listing.price} wETH</Card.Text>
                                                </Card.Footer>
                                            </Card>
                                }
                            </Col>
                        ))}
                    </Row>
                    {soldListings.length > 0 && renderSoldListings(soldListings)}
                </div>
                : (
                    <main style={{ padding: "1rem 0" }}>
                        <h2>No listed assets</h2>
                    </main>
                )}
        </div>
    );
}


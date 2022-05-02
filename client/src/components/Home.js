import React from 'react'
import { useState, useEffect } from 'react'
import { ethers, utils } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'
import { Contract } from '@ethersproject/contracts'
import ABI from "../WETH/ABI.json"

const moment = require('moment')

const Home = ({ marketplace }) => {
    const [loading, setLoading] = useState(true)
    const [listings, setListings] = useState([])
    const [bid, setBid] = useState(null)
    const [signer, setSigner] = useState()
    const loadMarketplaceListings = async () => {
        // Load all active listings 
        let listingCount = await marketplace.listingCount()
        listingCount = listingCount.toNumber()
        let listings = []
        for (let i = 1; i <= listingCount; i++) {
            const listing = await marketplace.listings(i)
            if (listing.auctionState.eq(1)) {
                const nftResponse = await fetch(`https://api-rinkeby.etherscan.io/api?module=contract&action=getabi&address=${listing.nft}&apikey=DCV4PCHFIVVYWR83CS48C4J45C9IH8SV93`)

                const nftMetadata = await nftResponse.json()
                const nftAbi = nftMetadata.result

                // Get provider from Metamask
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                // Set signer
                const signer = provider.getSigner()
                setSigner(signer)
                const nft = new Contract(listing.nft, nftAbi, signer)
                // get uri url from nft contract
                let uri = await nft.tokenURI(listing.tokenId)
                uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/")
                // use uri to fetch the nft metadata stored on ipfs 

                const response = await fetch(uri)

                const metadata = await response.json()
                let image = metadata.image
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                // Convert time 
                let convertedTime = moment.unix(listing.closingTime)
                // Convert Price
                let price = parseFloat(ethers.utils.formatUnits(listing.currentPrice, 18))
                // push to array
                listings.push({
                    price: price,
                    listingId: listing.listingId,
                    seller: listing.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: image,
                    time: convertedTime
                })
            }
        }
        setLoading(false)
        setListings(listings)
    }



    const bidOnListing = async (listing, bidPrice) => {
        const wethAddress = '0xc778417E063141139Fce010982780140Aa0cD5Ab'
        const weth = new ethers.Contract(wethAddress, ABI, signer)
        let adjustedPrice = utils.parseEther(bidPrice.toString())
        await (await weth.approve(marketplace.address, adjustedPrice)).wait()
        await (await marketplace.bid(listing.listingId, adjustedPrice.toString())).wait()
        loadMarketplaceListings()
    }

    useEffect(() => {
        loadMarketplaceListings()
    }, [])


    if (loading) return (
        <main style={{ padding: "1rem 0" }}>
            <h2>Loading...</h2>
        </main>
    )
    return (
        <div className="flex justify-center">
            {listings.length > 0 ?
                <div className="px-5 container">
                    <h2 className='mt-4'>NFT Listings</h2>
                    <p>When bidding, metamask will prompt for confirmation TWICE, accept both to bid</p>
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {listings.map((listing, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={listing.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>Price: {listing.price} wETH</Card.Title>
                                        <Card.Text>
                                            Name:{listing.name}
                                        </Card.Text>
                                        <Card.Text>Desc: {listing.description}</Card.Text>
                                        {Date.now() < listing.time &&
                                            <Card.Text>Closing Time: {moment(listing.time).format('lll')}</Card.Text>
                                        }
                                    </Card.Body>
                                    {Date.now() < listing.time ?
                                        <Card.Footer>
                                            <div className='d-grid'>
                                                <Form.Control onChange={(e) => setBid(e.target.value)} size="lg" required type="number" placeholder="Bid Amount" />
                                                <Form.Text className='text-muted'>Price in wETH</Form.Text>
                                                <Button onClick={() => bidOnListing(listing, bid)} variant="primary" size="lg">
                                                    Bid Now!
                                                </Button>
                                            </div>
                                        </Card.Footer> :

                                        <Card.Footer>
                                            <Card.Text>Listing Ended</Card.Text>
                                        </Card.Footer>

                                    }

                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
                : (
                    <main style={{ padding: "1rem 0" }}>
                        <h2>No Open Auctions</h2>
                    </main>
                )}
        </div>
    );
}

export default Home


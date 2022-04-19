import React from 'react'
import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'
import { Contract } from '@ethersproject/contracts'



const Home = ({ marketplace }) => {
    const [loading, setLoading] = useState(true)
    const [listings, setListings] = useState([])
    const [listingCounter, setListingCounter] = useState()

    const loadMarketplaceListings = async () => {
        // Load all active listings 
        let listingCount = await marketplace.listingCount()
        listingCount = listingCount.toNumber()
        setListingCounter(listingCount)
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
                const nft = new Contract(listing.nft, nftAbi, signer)
                // get uri url from nft contract
                let uri = await nft.tokenURI(listing.tokenId)
                uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/")
                // use uri to fetch the nft metadata stored on ipfs 

                const response = await fetch(uri)

                const metadata = await response.json()
                // get current price of listing
                let currentPrice = listing.currentPrice
                currentPrice = (currentPrice / (10 ** 16)) / 100
                let image = metadata.image
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                // push to array
                listings.push({
                    price: currentPrice,
                    listingId: listing.listingId,
                    seller: listing.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: image,
                    time: listing.closingTime
                })
            }
        }
        setLoading(false)
        setListings(listings)
    }

    const [bid, setBid] = useState(null)

    const bidOnListing = async (listing, bidPrice) => {
        await (await marketplace.bid(listing.listingId, bidPrice)).wait()
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
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {listings.map((listing, idx) => (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={listing.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{listing.price} ETH</Card.Title>
                                        <Card.Text>
                                            {listing.name}
                                        </Card.Text>
                                        <Card.Text>{listing.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Form.Control onChange={(e) => setBid(e.target.value)} size="lg" required type="number" placeholder="Price in 1/100 ETH" />
                                            <Form.Text className='text-muted'>Price in 1/100 ETH, e.g. input 2 to bid 0.02 ETH</Form.Text>
                                            <Button onClick={() => bidOnListing(listing, bid)} variant="primary" size="lg">
                                                Bid Now!
                                            </Button>
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
                : (
                    <main style={{ padding: "1rem 0" }}>
                        <h2>No open auctions</h2>
                        <h5> Listing Count: {listingCounter}</h5>
                    </main>
                )}
        </div>
    );
}

export default Home


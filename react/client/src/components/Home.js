import React from 'react'
import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'



const Home = ({ marketplace }) => {
    const [loading, setLoading] = useState(true)
    const [listings, setListings] = useState([])
    const loadMarketplaceListings = async () => {
        // Load all active listings
        let listingCount = await marketplace.listingCount()
        listingCount = listingCount.toNumber()
        let listings = []
        for (let i = 1; i <= listingCount; i++) {
            const listing = await marketplace.listings(i)
            if (listing.auctionState === 'OPEN') {
                const nft = listing.nft
                // get uri url from nft contract
                const uri = await nft.tokenURI(listing.tokenId)
                // use uri to fetch the nft metadata stored on ipfs 

                const response = await fetch(uri)

                const metadata = await response.json()
                // get current price of listing
                const currentPrice = listing.currentPrice
                // push to array
                listings.push({
                    price: currentPrice,
                    listingId: listing.listingId,
                    seller: listing.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
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
    })


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
                                        <Card.Title>{listing.name}</Card.Title>
                                        <Card.Text>
                                            {listing.description}
                                        </Card.Text>
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
                    </main>
                )}
        </div>
    );
}

export default Home


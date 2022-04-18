import React from 'react'
import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'
import { create } from 'ipfs-http-client'
const client = create('http://127.0.0.1:5001/api/v0/add')

const Create = ({ marketplace }) => {
    const [image, setImage] = useState('')
    const [reserve, setReserve] = useState(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [startPrice, setStartPrice] = useState(0)
    const [closing, setClosing] = useState(1)
    const [escrow, setEscrow] = useState(false)

    const uploadToIPFS = async (event) => {
        event.preventDefault()
        // No longer needed 
        const file = event.target.files[0]
        if (typeof file !== 'undefined') {
            try {
                const result = await client.add(file)
                console.log(result)
                setImage(`https://gateway.ipfs.io/ipfs/${result.path}`)
            } catch (error) {
                console.log("ipfs image upload error: ", error)
            }
        }
    }
    const createNFT = async () => {
        if (!image || !name || !description || !reserve) return
        try {
            const result = await client.add(JSON.stringify({ image, name, description, reserve }))
            mintThenList(result)
        } catch (error) {
            console.log("ipfs uri upload error: ", error)
        }
    }
    const mintThenList = async (result) => {
        const uri = `https://gateway.ipfs.io/ipfs/${result.path}`
        // mint nft 
        await (await nft.mint(uri)).wait()
        // get tokenId of new nft 
        const id = await nft.tokenCount()
        // approve marketplace to spend nft
        await (await nft.setApprovalForAll(marketplace.address, true)).wait()
        // add nft to marketplace
        await (await marketplace.createListing(reserve, startPrice, closing, id, nft.address, escrow)).wait()
    }
    return (
        <div className="container-fluid mt-5">
            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                        <Row className="g-4">
                            <Form.Control
                                type="file"
                                required
                                name="file"
                                onChange={uploadToIPFS}
                            />
                            <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
                            <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
                            <Form.Control onChange={(e) => setReserve(e.target.value)} size="lg" required type="number" placeholder="Reserve price in 1/100 ETH" />
                            <Form.Control onChange={(e) => setStartPrice(e.target.value)} size="lg" required type="number" placeholder="Starting price in 1/100 ETH" />
                            <Form.Control onChange={(e) => setClosing(e.target.value)} size="lg" required type="number" placeholder="Auction Length in Days" />
                            <Form.Check onChange={(e) => setEscrow(e.target.value)} size="lg" required type="switch" label='Escrow?' />
                            <div className="d-grid px-0">
                                <Button onClick={createNFT} variant="primary" size="lg">
                                    Create & List NFT!
                                </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Create

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MarketPlace is ReentrancyGuard {
    address payable public immutable feeAccount;
    uint256 public immutable feePercent;
    uint256 public listingCount;

    enum AUCTION_STATE {
        OPEN,
        PENDING,
        FINALIZED,
        CLOSED
    }
    AUCTION_STATE public auction_state;
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        uint256 reservePrice;
        uint256 startPrice;
        uint256 currentPrice;
        address payable seller;
        IERC721 nft;
        AUCTION_STATE auctionState;
        uint256 closingTime;
        bool escrow;
        address payable buyer;
        uint256 escrowClosingTime;
    }

    mapping(uint256 => Listing) public listings;

    event Listed(
        uint256 listingId,
        address indexed nft,
        uint256 tokenId,
        uint256 reservcePrice,
        uint256 startPrice,
        address indexed seller
    );

    event Bid(
        uint256 listingId,
        address indexed nft,
        uint256 tokenId,
        uint256 bidPrice,
        address indexed seller,
        address indexed bidder
    );

    event Bought(
        uint256 listingId,
        address indexed nft,
        uint256 tokenId,
        uint256 salePrice,
        address indexed seller,
        address indexed buyer
    );

    event Closed(uint256 listingId, address seller, address buyer);
    event confirmedEscrow(uint256 listingId, address seller);
    event reversedEscrow(uint256 listingId, address seller, address buyer);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    function createListing(
        uint256 _reservePrice,
        uint256 _startPrice,
        uint256 _closingTime,
        uint256 _tokenId,
        IERC721 _nft,
        bool _escrow
    ) external nonReentrant {
        require(_reservePrice >= 0, "Invalid reserve price");
        require(
            _reservePrice > _startPrice,
            "Start price must be higher than reserve"
        );
        require(
            _closingTime >= (block.timestamp + 1 days),
            "Auction length must be at least 1 day"
        );
        listingCount++;
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        listings[listingCount] = Listing(
            listingCount,
            _tokenId,
            _reservePrice,
            _startPrice,
            _startPrice,
            payable(msg.sender),
            _nft,
            AUCTION_STATE.OPEN,
            _closingTime,
            _escrow,
            payable(0x0000000000000000000000000000000000000000),
            (_closingTime + (7 * 1 days))
        );
        emit Listed(
            listingCount,
            address(_nft),
            _tokenId,
            _reservePrice,
            _startPrice,
            msg.sender
        );
    }

    function bid(uint256 _listingId, uint256 _bidPrice) external nonReentrant {
        Listing memory listing = listings[_listingId];
        address payable bidder = payable(msg.sender);
        require(
            bidder.balance > listing.currentPrice,
            "You don't have enough ETH to cover this bid!"
        );
        require(
            _bidPrice > listing.currentPrice,
            "Bid must be more than the current price, duh!"
        );
        require(
            listing.auctionState == AUCTION_STATE.OPEN,
            "This item is closed for bidding"
        );
        listing.currentPrice = _bidPrice;
        listing.buyer = bidder;
        emit Bid(
            _listingId,
            address(listing.nft),
            listing.tokenId,
            _bidPrice,
            listing.seller,
            bidder
        );
    }

    function endAuction(uint256 _listingId) external payable nonReentrant {
        Listing memory listing = listings[_listingId];
        require(
            msg.sender == listing.seller || msg.sender == listing.buyer,
            "Action not authorized"
        );
        require(
            block.timestamp > listing.closingTime,
            "Auction is still running"
        );
        require(
            msg.value == listing.currentPrice,
            "Not enough ETH to cover price!"
        );
        // Update auction state if transaction fails
        if (msg.value < listing.currentPrice) {
            listing.auctionState = AUCTION_STATE.CLOSED;
            emit Closed(_listingId, listing.seller, listing.buyer);
            // Ban buyer address from bidding ?
        }
        if (!listing.escrow) {
            // Auto-Finalize and transfer if no escrow
            listing.auctionState == AUCTION_STATE.FINALIZED;
            listing.seller.transfer(listing.currentPrice * (1 - feePercent));
            feeAccount.transfer(listing.currentPrice * feePercent);
            listing.nft.transferFrom(
                address(this),
                listing.buyer,
                listing.tokenId
            );
            emit Bought(
                _listingId,
                address(listing.nft),
                listing.tokenId,
                listing.currentPrice,
                listing.seller,
                listing.buyer
            );
        } else {
            listing.auctionState == AUCTION_STATE.PENDING;
        }
    }

    function confirmEscrow(uint256 _listingId) external payable nonReentrant {
        Listing memory listing = listings[_listingId];
        require(msg.sender == listing.buyer, "Only buyer can alter escrow");
        require(listing.auctionState == AUCTION_STATE.PENDING);
        require(
            block.timestamp < listing.escrowClosingTime,
            "Escrow has expired, the sale will be reversed"
        );
        listing.seller.transfer(listing.currentPrice * (1 - feePercent));
        listing.nft.transferFrom(address(this), listing.buyer, listing.tokenId);
        listing.auctionState = AUCTION_STATE.FINALIZED;
        emit confirmedEscrow(_listingId, listing.seller);
    }

    function reverseEscrow(uint256 _listingId) external payable nonReentrant {
        Listing memory listing = listings[_listingId];
        require(msg.sender == listing.buyer, "Only buyer can alter escrow");
        require(listing.auctionState == AUCTION_STATE.PENDING);
        require(
            block.timestamp > listing.escrowClosingTime,
            "The escrow time has not expired yet"
        );
        listing.buyer.transfer(listing.currentPrice * (1 - feePercent));
        listing.nft.transferFrom(
            address(this),
            listing.seller,
            listing.tokenId
        );
        listing.auctionState = AUCTION_STATE.FINALIZED;
        emit reversedEscrow(_listingId, listing.seller, listing.buyer);
    }
}

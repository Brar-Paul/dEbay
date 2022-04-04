// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketPlace is ReentrancyGuard {
    IERC20 weth;
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

    event Listed(uint256 indexed listingId, address indexed seller);

    event Bid(
        uint256 indexed listingId,
        uint256 bidPrice,
        address indexed seller,
        address indexed bidder
    );

    event Bought(
        uint256 indexed listingId,
        uint256 salePrice,
        address indexed seller,
        address indexed buyer
    );

    event Closed(uint256 indexed listingId, address seller, address buyer);
    event confirmedEscrow(uint256 indexed listingId, address seller);
    event WithdrawEscrow(
        uint256 indexed listingId,
        address seller,
        address buyer
    );

    constructor(uint256 _feePercent, IERC20 _weth) {
        weth = _weth;
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
            _reservePrice >= _startPrice,
            "Start price cannot be higher than reserve"
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
            payable(address(0)),
            (_closingTime + (7 days))
        );
        emit Listed(listingCount, msg.sender);
    }

    function bid(uint256 _listingId, uint256 _bidPrice) external nonReentrant {
        Listing memory listing = listings[_listingId];
        address payable bidder = payable(msg.sender);
        require(
            weth.balanceOf(bidder) > listing.currentPrice,
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
        weth.approve(address(this), _bidPrice);
        listing.currentPrice = _bidPrice;
        listing.buyer = bidder;
        emit Bid(_listingId, _bidPrice, listing.seller, bidder);
    }

    function endAuction(uint256 _listingId) external nonReentrant {
        Listing memory listing = listings[_listingId];
        require(
            msg.sender == listing.seller || msg.sender == listing.buyer,
            "Action not authorized"
        );
        require(
            block.timestamp > listing.closingTime,
            "Auction is still running"
        );
        // Cancels deal if buyer does not have balance to cover sale price
        if (weth.balanceOf(listing.buyer) < listing.currentPrice) {
            revert(
                "Buyer does not wETH balance to cover the sale price, sale reverted"
            );
            listing.auctionState = AUCTION_STATE.CLOSED;
            emit Closed(_listingId, listing.seller, listing.buyer);
        }
        // Auto-Finalize and transfer if no escrow
        if (!listing.escrow) {
            listing.auctionState == AUCTION_STATE.FINALIZED;
            weth.transferFrom(
                listing.buyer,
                listing.seller,
                listing.currentPrice * (1 - feePercent)
            );
            weth.transferFrom(
                listing.buyer,
                feeAccount,
                listing.currentPrice * feePercent
            );
            listing.nft.safeTransferFrom(
                address(this),
                listing.buyer,
                listing.tokenId
            );
            emit Bought(
                _listingId,
                listing.currentPrice,
                listing.seller,
                listing.buyer
            );
        } else {
            weth.transferFrom(
                listing.buyer,
                address(this),
                listing.currentPrice
            );
            listing.auctionState == AUCTION_STATE.PENDING;
        }
    }

    function confirmEscrow(uint256 _listingId) external payable nonReentrant {
        Listing memory listing = listings[_listingId];
        require(msg.sender == listing.buyer, "Only buyer can finalize escrow");
        require(listing.auctionState == AUCTION_STATE.PENDING);
        require(
            block.timestamp < listing.escrowClosingTime,
            "Escrow has expired, the sale will be reversed"
        );
        listing.seller.transfer(listing.currentPrice * (1 - feePercent));
        weth.transferFrom(
            address(this),
            feeAccount,
            listing.currentPrice * feePercent
        );
        listing.nft.safeTransferFrom(
            address(this),
            listing.buyer,
            listing.tokenId
        );
        listing.auctionState = AUCTION_STATE.FINALIZED;
        emit confirmedEscrow(_listingId, listing.seller);
    }

    function withdrawEscrow(uint256 _listingId) external payable nonReentrant {
        Listing memory listing = listings[_listingId];
        require(
            msg.sender == listing.buyer,
            "Only buyer can withdraw from escrow"
        );
        require(listing.auctionState == AUCTION_STATE.PENDING);
        require(
            block.timestamp > listing.escrowClosingTime,
            "The escrow time has not expired yet"
        );
        weth.transferFrom(
            address(this),
            listing.buyer,
            listing.currentPrice * (1 - feePercent)
        );
        listing.nft.safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId
        );
        listing.auctionState = AUCTION_STATE.FINALIZED;
        emit WithdrawEscrow(_listingId, listing.seller, listing.buyer);
    }
}

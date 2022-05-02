// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Marketplace is ReentrancyGuard {
    IERC20 public weth;
    address payable public immutable feeAccount;
    uint256 public immutable feePercent;
    uint256 public listingCount;

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        uint256 reservePrice;
        uint256 currentPrice;
        address payable seller;
        IERC721 nft;
        uint256 auctionState;
        uint256 closingTime;
        address payable buyer;
        uint256 bidCounter;
    }

    // auctionState legend: 1 = Open, 2 = Closed, 3 = Reverted

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

    event Reverted(
        uint256 listingId,
        address indexed seller,
        address indexed buyer
    );

    constructor(uint256 _feePercent, address _weth) {
        weth = IERC20(_weth);
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    function createListing(
        uint256 _reservePrice,
        uint256 _startPrice,
        uint256 _closingTime,
        uint256 _tokenId,
        IERC721 _nft
    ) external nonReentrant {
        require(_reservePrice >= 0, "Invalid reserve price");
        require(
            _reservePrice >= _startPrice,
            "Start price cannot be higher than reserve"
        );
        require(_closingTime >= (1), "Auction length must be at least 1 day");
        listingCount++;
        // setApprovalForAll is handled via front end before calling contract function
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        listings[listingCount] = Listing(
            listingCount,
            _tokenId,
            _reservePrice,
            _startPrice,
            payable(msg.sender),
            _nft,
            1,
            (block.timestamp + (_closingTime * 1 days)),
            payable(address(0)),
            0
        );
        emit Listed(listingCount, msg.sender);
    }

    function bid(uint256 _listingId, uint256 _bidPrice) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(block.timestamp < listing.closingTime, "Auction has ended");
        require(
            weth.balanceOf(msg.sender) > listing.currentPrice,
            "You don't have enough ETH to cover this bid!"
        );
        require(
            _bidPrice > listing.currentPrice,
            "Bid must be more than the current price, duh!"
        );
        require(listing.auctionState == 1, "This item is not open for bidding");
        listing.buyer = payable(msg.sender);
        listing.currentPrice = _bidPrice;
        // Call to approve weth transaction for value of bidprice is handled via front end
        listing.bidCounter++;
        emit Bid(_listingId, _bidPrice, listing.seller, listing.buyer);
    }

    function endAuction(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        IERC721 nft = listing.nft;
        require(
            listing.currentPrice >= listing.reservePrice,
            "Reserve not met"
        );
        require(
            block.timestamp > listing.closingTime,
            "Auction is still running"
        );
        require(
            msg.sender == listing.buyer || msg.sender == listing.seller,
            "Action not authorized"
        );
        if (weth.balanceOf(listing.buyer) < listing.currentPrice) {
            revert(
                "Buyer does not wETH balance to cover the sale price, sale reverted"
            );
            listing.auctionState = 3;
            emit Reverted(_listingId, listing.seller, listing.buyer);
        } else {
            weth.transferFrom(
                listing.buyer,
                listing.seller,
                listing.currentPrice * (1 - (feePercent / 100))
            );
            weth.transferFrom(
                listing.buyer,
                feeAccount,
                listing.currentPrice * (feePercent / 100)
            );
            nft.safeTransferFrom(address(this), listing.buyer, listing.tokenId);
            listing.auctionState = 2;
            emit Bought(
                listing.listingId,
                listing.currentPrice,
                listing.seller,
                listing.seller
            );
        }
    }

    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        IERC721 nft = listing.nft;
        require(
            listing.auctionState == 1 || listing.auctionState == 3,
            "Action is not authorized"
        );
        require(listing.seller == msg.sender);
        nft.safeTransferFrom(address(this), listing.seller, listing.tokenId);
        listing.auctionState = 2;
        emit Reverted(_listingId, listing.seller, listing.buyer);
    }
}

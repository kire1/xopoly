import { Player } from "./Player";
import { Auction } from "./Auction";
import { TradeOffer } from "./TradeOffer";

export class GameState {
    players: Player[];
    tiles: any[];
    turnTimeoutSeconds: number;
    currentPlayerListIndex: number;
    currentPlayer: Player;
    currentFrameId: number;
    waitForBuyOrAuctionStart: boolean;
    currentTile: any;
    auctionInProgress: boolean;
    auction: Auction;
    tradeOffers: TradeOffer[];
    communityChestDeck: any;
    chanceDeck: any;
    gameFinished: boolean;
}
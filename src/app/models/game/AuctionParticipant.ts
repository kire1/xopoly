
import { Player } from "./Player";

export class AuctionParticipant extends Player {
    auctionBet: number;
    hasPlacedBet: boolean;
    betPosition: number;

    AuctionParticipant(player: Player){
        this.auctionBet = null;
        this.id = player.id;
        this.name = player.name;
        this.money = player.money;
        this.boardPosition = player.boardPosition;
        this.numDoublesRolledInARow = player.numDoublesRolledInARow;
        this.currentDiceRoll = player.currentDiceRoll;
        this.isInJail = player.isInJail;
        this.rollsWhileInJail = player.rollsWhileInJail;
    }
}
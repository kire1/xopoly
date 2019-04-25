import { Player } from "./Player";

export class TradeOffer {
    id: string;
    playerA: Player;
    playerB: Player;
    playerAProperties: any[];
    playerBProperties: any[];
    moneyAB: number;
}
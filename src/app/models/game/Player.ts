export class Player {
    id: string;
    name: string;
    money: number;
    boardPosition: number;
    prevBoardPosition: number;
    wasDirectMovement: boolean;
    numDoublesRolledInARow: number;
    currentDiceRoll: any;
    isInJail: boolean;
    rollsWhileInJail: number;
    color: string;
    hasGetOutOfJailFreeCard: boolean;
    currentTurnElapsedSeconds: number;
}
import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap/';
import { IconDefinition, faUser, faMoneyBillWave, faDiceOne, faDiceTwo, faDiceThree, faDiceFour, faDiceFive, faDiceSix } from '@fortawesome/free-solid-svg-icons';
import * as _ from 'lodash';

import { InteractionsService } from "../../services/InteractionsService";
import { GameState } from "src/app/models/game/GameState";
import { Player } from 'src/app/models/game/Player';
import { LobbyState } from 'src/app/models/lobby/LobbyState';
import { TradeOffer } from 'src/app/models/game/TradeOffer';
import { TileTypes } from '../board/board.component';

@Component({
  selector: 'interactions',
  templateUrl: './interactions.component.html',
  styleUrls: ['./interactions.component.scss'],
  encapsulation: ViewEncapsulation.Native
})
export class InteractionsComponent implements OnInit {
  @ViewChild('propertyBuyModalContent') propertyBuyModalContent: ElementRef;
  @ViewChild('propertyAuctionModalContent') propertyAuctionModalContent: ElementRef;

  @Output() startPropertySelection = new EventEmitter<string>();

  nonPropertyIds = [0, 2, 4, 7, 10, 17, 20, 22, 30, 33, 36, 38];
  twoMonoPropertyIds = [1, 3, 37, 39];

  private propertyBuyModalRef: NgbModalRef;
  private propertyAuctionModalRef: NgbModalRef;
  private tradeModalRef: NgbModalRef;
  private tradeOffersModalRef: NgbModalRef;

  faUser: IconDefinition = faUser;
  faMoneyBillWave: IconDefinition = faMoneyBillWave;
  faDiceOne: IconDefinition = faDiceOne;
  faDiceTwo: IconDefinition = faDiceTwo;
  faDiceThree: IconDefinition = faDiceThree;
  faDiceFour: IconDefinition = faDiceFour;
  faDiceFive: IconDefinition = faDiceFive;
  faDiceSix: IconDefinition = faDiceSix;

  gamePlayerId: string;
  gameState: GameState;
  prevGameState: GameState;
  lobbyState: LobbyState;
  rejectedOffer: TradeOffer;
  acceptedOffer: TradeOffer;
  gamePlayer: Player;
  lastDiceRoll: number[];

  rollBtnEnabled: boolean;
  endTurnBtnEnabled: boolean;
  buildBtnEnabled: boolean;
  sellBtnEnabled: boolean;
  redeemBtnEnabled: boolean;
  mortgageBtnEnabled: boolean;
  tradeBtnEnabled: boolean;
  payJailFeeBtnEnabled: boolean;
  getOutOfJailFreeBtnEnabled: boolean;
  gameInProgress: boolean;
  viewOffersBtnEnabled: boolean;

  tradeInProgress: boolean;
  tradeOffersInProgress: boolean;
  propertySelectionInProgress: boolean;

  tradeTargetPlayer: Player;
  tradeTargetPlayerAllProperties: any[];
  tradeTargetPlayerSelectedProperties: any[];
  tradeTargetPlayerMoney: number;
  tradeMyPlayerAllProperties: any[];
  tradeMyPlayerSelectedProperties: any[];
  tradeMyPlayerMoney: number;
  tradePlayers: Player[];

  offers: TradeOffer[];
  canAfford: boolean;
  gameLog: string[];
  msgAuctionWinner: string;
  waitingToOpen: boolean;

  //dev use
  loadInstantMono: boolean = false;

  constructor(private modalService: NgbModal, private interactionsService: InteractionsService) {
    this.lastDiceRoll = [2, 2];
    this.tradeTargetPlayerSelectedProperties = [];
    this.tradeMyPlayerSelectedProperties = [];
    this.offers = [];
    this.gameLog = [];
  }

  ngOnInit(): void {
    this.initNewLobbyState();
    this.initNewGameState();
  }

  private initNewGameState() {
    this.interactionsService.gameLogEntry().subscribe((gameLog) => {
      if (gameLog.length !== this.gameLog.length) {
        this.gameLog = this.colorPlayersNames(gameLog);
      }
    });

    this.interactionsService.rejectedTradeId().subscribe((rejectedTradeId) => {
      var rejectedOffer = this.gameState.tradeOffers.find(x => x.id == rejectedTradeId);
      if (rejectedOffer) {
        this.acceptedOffer = undefined;
        this.rejectedOffer = rejectedOffer;
      }
    });

    this.interactionsService.acceptedTradeId().subscribe((acceptedTradeId) => {
      var acceptedOffer = this.gameState.tradeOffers.find(x => x.id == acceptedTradeId);
      if (acceptedOffer) {
        this.rejectedOffer = undefined;
        this.acceptedOffer = acceptedOffer;
      }
    });

    this.interactionsService.newGameState().subscribe((newGameState) => {
      console.log("interactions - gameState - ", newGameState);
      this.prevGameState = this.gameState;
      this.gameState = newGameState;
      this.gamePlayer = newGameState.players.find((p) => { return p.id === this.gamePlayerId; });
      this.gameInProgress = newGameState ? true : false;
      if (this.loadInstantMono && this.isPlayersTurn()) {
        this.instantMono();
        this.loadInstantMono = false;
      }
      this.updateStates();
      //u land on a propery
      if (this.canOpenBuyPropertyModal() && !this.propertyBuyModalRef && !this.waitingToOpen) {
        this.waitingToOpen = true;
        this.interactionsService.newGameStateForOpenProp().subscribe((newGameState) => {
          this.openPropertyBuyModal();
          this.waitingToOpen = false;
        });
      }
      //someone else auctioned a property
      if (this.canBetOnAuction() && !this.propertyAuctionModalRef) {
        this.closePropertyBuyModal();
        this.openPropertyAuctionModal();
      }
      if (!this.gameState.auctionInProgress) {
        this.closePropertyAuctionModal();
      }
      //update trades properties if, trade is open and things change
      if (this.tradeInProgress && this.tradeTargetPlayer) {
        let newTradeTargetPlayerAllProperties = this.getOwnedPropertiesForTrade(this.tradeTargetPlayer.id);
        let newTradeMyPlayerAllProperties = this.getOwnedPropertiesForTrade(this.gamePlayerId);
        if (this.compareById(this.tradeTargetPlayerAllProperties, newTradeTargetPlayerAllProperties)) {
          this.tradeTargetPlayerAllProperties = newTradeTargetPlayerAllProperties;
        }
        if (this.compareById(this.tradeMyPlayerAllProperties, newTradeMyPlayerAllProperties)) {
          this.tradeMyPlayerAllProperties = newTradeMyPlayerAllProperties;
        }
      }
      //updates offers if offers modal is open and things change
      if (this.gameState.tradeOffers && this.compareById(this.gameState.tradeOffers, this.offers)) {
        this.offers = this.gameState.tradeOffers.filter(to => to.playerA.id === this.gamePlayerId || to.playerB.id === this.gamePlayerId);
      }
      if (this.gameState.tradeOffers.length === 0) {
        this.closeTradeOffersModal();
      }
      this.checkForAuctionWinner();
    });
  }

  colorPlayersNames(gameLog: string[]): string[] {
    if (this.gameState) {
      let players = this.gameState.players;
      for (let i = 0; i < gameLog.length; i++) {
        let gameLogEntryTextArray = gameLog[i].split(" ");
        for (let j = 0; j < gameLogEntryTextArray.length; j++) {
          let text = gameLogEntryTextArray[j];
          let player = players.find(p => text.includes(p.name));
          if (player) {
            gameLogEntryTextArray[j] = '<span class="Player-Background-' + player.color + '">' + player.name + '</span>';
          }
        }
        gameLog[i] = gameLogEntryTextArray.join(" ");
      }
    }

    return gameLog;
  }

  private checkForAuctionWinner(): void {
    if (this.prevGameState && this.gameState) {
      if (this.prevGameState.auction && !this.gameState.auction) {
        var auctionedProperty = this.gameState.tiles.find(t => t.id == this.prevGameState.currentTile.id);
        var auctionWinner = this.gameState.players.find(x => x.id == auctionedProperty.ownerPlayerID);
        var auctionWinnerBetAmount = this.prevGameState.players.find(x => x.id == auctionWinner.id).money - auctionWinner.money;
        this.msgAuctionWinner = '<span class="Player-Background-' + auctionWinner.color + '">' + auctionWinner.name + '</span>' + " won the auction for " + auctionedProperty.name + " in the amount of $" + auctionWinnerBetAmount + "!";
      }else if(this.gameState.auction){
        this.msgAuctionWinner = undefined;
      }
    }
  }

  private initNewLobbyState() {
    this.interactionsService.newLobbyState().subscribe((newLobbyState) => {
      this.gamePlayerId = newLobbyState.player.gameID;
      let lobby = newLobbyState.lobbies.find((l) => {
        return l.players.find((p) => {
          return p.computerUserID === newLobbyState.player.computerUserID;
        }) != undefined;
      });
      if (!lobby) {
        this.gameInProgress = false;
      }
    });
    this.interactionsService.requestStateUpdate();
  }

  rollDice(): void {
    if (this.rollBtnEnabled) {
      this.interactionsService.rollDice().subscribe(() => {
      });
    }
  }

  buyProperty(): void {
    if (this.canAfford) {
      this.interactionsService.buyProperty().subscribe(() => {
        this.closePropertyBuyModal();
      });
    }
  }

  auctionProperty(): void {
    this.interactionsService.startAuctionOnProperty().subscribe(() => {
      this.closePropertyBuyModal();
    });
  }

  endTurn(): void {
    if (this.endTurnBtnEnabled) {
      this.interactionsService.endTurn().subscribe(() => {
        this.rejectedOffer = undefined;
        this.acceptedOffer = undefined;
        this.msgAuctionWinner = undefined;
      });
    }
  }

  declareBankruptcy(): void {
    if (this.gamePlayer.money < 0) {
      this.interactionsService.declareBankruptcy().subscribe(() => {
      });
    }
  }

  betOnAuction(amount: number): void {
    this.interactionsService.betOnAuction(amount || 0).subscribe(() => {
      this.closePropertyAuctionModal();
    });
  }

  startMortgage(): void {
    if (this.mortgageBtnEnabled) {
      this.propertySelectionInProgress = true;
      this.startPropertySelection.emit(TileTypes.MortgageProperty);
    }
  }

  startRedeem(): void {
    if (this.redeemBtnEnabled) {
      this.propertySelectionInProgress = true;
      this.startPropertySelection.emit(TileTypes.RedeemProperty);
    }
  }

  startBuild(): void {
    if (this.buildBtnEnabled) {
      this.propertySelectionInProgress = true;
      this.startPropertySelection.emit(TileTypes.BuildHouse);
    }
  }

  startSell(): void {
    if (this.sellBtnEnabled) {
      this.propertySelectionInProgress = true;
      this.startPropertySelection.emit(TileTypes.SellHouse);
    }
  }

  stopPorpertySelection() {
    this.startPropertySelection.emit(TileTypes.None);
    this.propertySelectionInProgress = false;
  }

  payJailFee() {
    if (this.payJailFeeBtnEnabled) {
      this.interactionsService.payJailFee();
    }
  }

  useGetOutOfJailFreeCard() {
    if (this.getOutOfJailFreeBtnEnabled) {
      this.interactionsService.useGetOutOfJailFreeCard();
    }
  }

  getPlayerTimerProgressBarType(timeElapsed: number): string {
    let barType = 'danger';
    if (timeElapsed < 15) {
      barType = 'success';
    }
    else if (timeElapsed < 30) {
      barType = 'warning';
    }
    return barType;
  }

  setTradePlayer(id: string): void {
    this.tradeTargetPlayer = this.gameState.players.find(p => p.id === id);
    this.tradeTargetPlayerAllProperties = this.getOwnedPropertiesForTrade(id);
  }

  getMoneyColor(money: number): string {
    let color = 'green-money';
    if (money < 0) {
      color = 'red-money';
    }
    return color;
  }

  openTradeModal(content: any): void {
    if (!this.tradeModalRef && this.gamePlayer && this.tradeBtnEnabled) {
      this.getTradePlayers();
      this.tradeMyPlayerAllProperties = this.getOwnedPropertiesForTrade(this.gamePlayerId);
      this.tradeModalRef = this.modalService.open(content, { centered: true });
      this.tradeInProgress = true;
      this.tradeModalRef.result.then(() => {
      }, (reason) => {
        this.closeTradeModal();
      });
    }
  }

  openTradeOffersModal(content: any): void {
    if (!this.tradeOffersModalRef && this.gamePlayer && this.viewOffersBtnEnabled) {
      this.tradeOffersModalRef = this.modalService.open(content, { centered: true });
      this.tradeOffersInProgress = true;
      this.tradeOffersModalRef.result.then(() => {
      }, (reason) => {
        this.closeTradeOffersModal();
      });
    }
  }

  acceptOffer(tradeId: string, playerId: string): void {
    if (playerId !== this.gamePlayerId) {
      this.interactionsService.acceptTrade(tradeId);
    }
  }

  rejectOffer(tradeId: string, playerId: string): void {
    if (playerId !== this.gamePlayerId) {
      this.interactionsService.rejectTrade(tradeId);
    }
  }

  tradeProperty(id: number) {
    if (this.tradeMyPlayerAllProperties.some(t => t.id === id)) {
      if (!this.tradeMyPlayerSelectedProperties.some(porpId => porpId === id)) {
        this.tradeMyPlayerSelectedProperties.push(id);
      } else {
        this.tradeMyPlayerSelectedProperties = this.tradeMyPlayerSelectedProperties.filter(porpId => porpId !== id);
      }
    } else if (this.tradeTargetPlayerAllProperties.some((t) => { return t.id === id })) {
      if (!this.tradeTargetPlayerSelectedProperties.some((porpId) => { return porpId === id })) {
        this.tradeTargetPlayerSelectedProperties.push(id);
      } else {
        this.tradeTargetPlayerSelectedProperties = this.tradeTargetPlayerSelectedProperties.filter(porpId => porpId !== id);
      }
    }
  }

  propertyAdded(id: number): boolean {
    if (this.tradeMyPlayerAllProperties.some(t => t.id === id)) {
      return this.tradeMyPlayerSelectedProperties.some(porpId => porpId === id);
    }

    if (this.tradeTargetPlayerAllProperties.some(t => t.id === id)) {
      return this.tradeTargetPlayerSelectedProperties.some(porpId => porpId === id);
    }
  }

  closeTradeModal(): void {
    if (this.tradeModalRef) {
      this.tradeModalRef.close();
      this.tradeInProgress = false;
      this.tradeModalRef = undefined;
      this.tradeReset();
    }
  }

  closeTradeOffersModal(): void {
    if (this.tradeOffersModalRef) {
      this.tradeOffersModalRef.close();
      this.tradeOffersModalRef = undefined;
      this.tradeOffersInProgress = false;
      if (this.gameState.tradeOffers.length === 0) {
        this.offers = [];
      }
    }
  }

  closePropertyAuctionModal(): void {
    if (this.propertyAuctionModalRef) {
      this.propertyAuctionModalRef.close();
      this.propertyAuctionModalRef = undefined;
    }
  }

  instantMono() {
    this.interactionsService.instantMono();
  }

  sendOffer() {
    if (this.tradeTargetPlayer) {
      this.interactionsService.sendTrade(this.tradeTargetPlayer.id, this.tradeMyPlayerSelectedProperties, this.tradeTargetPlayerSelectedProperties, this.tradeMyPlayerMoney, this.tradeTargetPlayerMoney).subscribe(() => {
        this.closeTradeModal();
      });
    }
  }

  private tradeReset(): void {
    this.tradeTargetPlayerMoney = undefined;
    this.tradeTargetPlayer = undefined;
    this.tradeTargetPlayerAllProperties = [];
    this.tradeTargetPlayerSelectedProperties = [];
    this.tradeMyPlayerMoney = undefined;
    this.tradeMyPlayerAllProperties = [];
    this.tradeMyPlayerSelectedProperties = [];
    this.tradePlayers = [];
  }

  private compareById(listA: any[], listB: any[]): boolean {
    let update = false;
    if (listA.length !== listB.length) {
      update = true;
    } else {
      for (let itemB of listB) {
        update = !listA.some((itemA) => {
          if (itemA && itemB) {
            return itemA.id === itemB.id;
          } else {
            return false;
          }
        });
        if (update) {
          break;
        }
      }
    }
    return update;
  }

  private getTradePlayers(): void {
    let pendingTradesIds: string[] = [];
    if (this.offers && this.offers.length > 0) {
      let playerPresentInOffer = this.offers.some(o => o.playerA.id === this.gamePlayerId || o.playerB.id === this.gamePlayerId);

      if (playerPresentInOffer) {
        for (let offer of this.offers) {
          if (offer.playerA.id === this.gamePlayerId) {
            pendingTradesIds.push(offer.playerB.id);
          }
        }
        if (pendingTradesIds.length > 0) {
          for (let id of pendingTradesIds) {
            this.tradePlayers = this.gameState.players.filter(p => p.id !== id && p.id !== this.gamePlayerId);
          }
        }
      }
    }

    if (!this.tradePlayers || (this.tradePlayers && this.tradePlayers.length === 0)) {
      this.tradePlayers = this.gameState.players.filter(p => p.id !== this.gamePlayerId);
    }
  }

  private getOwnedProperties(id: string): any[] {
    let ownedProps = [];
    if (id && this.gameState.tiles) {
      ownedProps = this.gameState.tiles.filter(t => t.ownerPlayerID == id);
    }
    return ownedProps;
  }

  private getOwnedPropertiesForTrade(id: string): any[] {
    let ownedProps = [];
    let filterMonoListIds = [];

    if (id && this.gameState.tiles) {
      ownedProps = this.gameState.tiles.filter(x => x.ownerPlayerID == id);
      let coloredProperties = ownedProps.filter(x => x.type === 'ColorProperty');
      let coloredPropertyGroups = _.groupBy(coloredProperties, 'color');
      let propColors = Object.keys(coloredPropertyGroups);

      for (let propColor of propColors) {
        let props = coloredPropertyGroups[propColor];
        if (props.length === 3 && props.some(t => t.buildingCount > 0)) {
          for (let prop of props) {
            filterMonoListIds.push(prop.id);
          }
        } else if (props.length === 2 && props.some(t => t.buildingCount > 0)) {
          for (let prop of props) {
            if (prop.color === "Brown" || prop.color === "DarkBlue") {
              filterMonoListIds.push(prop.id);
            }
          }
        }
      }

      if (filterMonoListIds.length > 0) {
        ownedProps = ownedProps.filter(x => !filterMonoListIds.some(filterId => x.id === filterId));
      }
    }

    return ownedProps;
  }

  private closePropertyBuyModal(): void {
    if (this.propertyBuyModalRef) {
      this.propertyBuyModalRef.close();
      this.propertyBuyModalRef = undefined;
    }
  }

  private openPropertyBuyModal(): void {
    if (!this.propertyBuyModalRef) {
      this.propertyBuyModalRef = this.modalService.open(this.propertyBuyModalContent, { centered: true });
      this.propertyBuyModalRef.result.then(() => {
      }, (reason) => {
        this.closePropertyBuyModal();
        this.openPropertyBuyModal();
      });
    }
  }

  private openPropertyAuctionModal(): void {
    if (!this.propertyAuctionModalRef) {
      this.propertyAuctionModalRef = this.modalService.open(this.propertyAuctionModalContent, { centered: true });
      this.propertyAuctionModalRef.result.then(() => {
      }, (reason) => {
        this.closePropertyAuctionModal();
        this.openPropertyAuctionModal();
      });
    }
  }

  private getlastDiceRoll(): void {
    if (this.gameState.currentPlayer.currentDiceRoll) {
      this.lastDiceRoll = this.gameState.currentPlayer.currentDiceRoll.dice;
    } else if (this.gameState.players.some(x => x.currentDiceRoll && x.currentDiceRoll.dice)) {
      this.lastDiceRoll = this.gameState.players.filter(x => x.currentDiceRoll && x.currentDiceRoll.dice)[0].currentDiceRoll.dice;
    }
  }

  private updateStates(): void {
    this.canMortgage();
    this.canEndTurn();
    this.canRedeem();
    this.canTrade();
    this.canBuild();
    this.canSell();
    this.canViewOffers();
    this.canPayJailFee();
    this.canGetOutOfJailFree();
    this.canRollDice();
    this.getlastDiceRoll();
  }

  private canViewOffers(): void {
    this.viewOffersBtnEnabled =
      this.gameState.tradeOffers.length > 0 &&
      this.offers.length > 0
  }

  private canTrade(): void {
    let otherPlayers = this.getOtherPlayers();
    this.tradeBtnEnabled = this.gamePlayer &&
      this.gamePlayer.money > 0 &&
      otherPlayers && otherPlayers.length > 0
  }

  private canBuild(): void {
    let ownedProperties = this.getOwnedProperties(this.gamePlayerId);
    let canBuild = false;

    if (this.isPlayersTurn() && ownedProperties.length > 1) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type == 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');
      canBuild = Object.keys(coloredProperties).some(key =>
        coloredProperties[key].every(prop => prop.ownerPlayerID == this.gamePlayerId) &&
        coloredProperties[key].every(prop => !prop.isMortgaged) &&
        coloredProperties[key].some(prop => prop.buildingCount < 5));
    }

    this.buildBtnEnabled = canBuild;
  }

  private canSell(): void {
    let ownedProperties = this.getOwnedProperties(this.gamePlayerId);
    let canSell = false;

    if (this.isPlayersTurn() && ownedProperties.length > 1) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type == 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');
      canSell = Object.keys(coloredProperties).some(key =>
        coloredProperties[key].some(prop => prop.buildingCount > 0) &&
        coloredProperties[key].every(prop => prop.ownerPlayerID == this.gamePlayerId));
    }

    this.sellBtnEnabled = canSell;
  }

  private canMortgage(): void {
    let canMortgage = false;
    let ownedProperties = this.getOwnedProperties(this.gamePlayerId);

    canMortgage = this.isPlayersTurn() &&
      ownedProperties.length > 0 &&
      ownedProperties.some(x => !x.isMortgaged) &&
      !this.gameState.auctionInProgress;

    if (canMortgage) {
      let coloredPropertyGroups = this.gameState.tiles.filter(x => x.type == 'ColorProperty');
      let ownedMonopolyColors = Object.keys(coloredPropertyGroups).filter((key) => { return coloredPropertyGroups[key].ownerPlayerID == this.gamePlayerId; });
      let ownedMonopolies = ownedMonopolyColors.map(k => coloredPropertyGroups[k]);

      if (ownedMonopolies && ownedMonopolies.length > 0 &&
        ownedMonopolies.some((monopolyProp) => monopolyProp.buildingCount > 0 || monopolyProp.isMortgaged) &&
        !ownedProperties.filter(x => !ownedMonopolies.some(monopolyProp => monopolyProp.id == x.id || !monopolyProp.isMortgaged))) {
        canMortgage = false;
      }
    }

    this.mortgageBtnEnabled = canMortgage;
  }

  private canRedeem(): void {
    let ownedProperties = this.getOwnedProperties(this.gamePlayerId);

    this.redeemBtnEnabled = (this.isPlayersTurn() &&
      ownedProperties.length > 0 &&
      (ownedProperties.some(x => x.isMortgaged)));
  }

  private canPayJailFee(): void {
    this.payJailFeeBtnEnabled = this.isPlayersTurn() &&
      this.gameState.currentPlayer.isInJail
      && !this.gameState.currentPlayer.currentDiceRoll;
  }

  private canGetOutOfJailFree(): void {
    this.getOutOfJailFreeBtnEnabled = this.isPlayersTurn() &&
      this.gameState.currentPlayer.isInJail &&
      this.gameState.currentPlayer.hasGetOutOfJailFreeCard;
  }

  private canRollDice(): void {
    this.rollBtnEnabled = this.isPlayersTurn() &&
      !this.gameState.waitForBuyOrAuctionStart &&
      this.gameState.currentPlayer.money >= 0 &&
      (!this.gameState.currentPlayer.currentDiceRoll || (this.gameState.currentPlayer.currentDiceRoll.isDouble && !this.gameState.currentPlayer.isInJail)) &&
      !this.gameState.auctionInProgress;
  }

  private canEndTurn(): void {
    let curPlayer = this.gameState.currentPlayer;
    this.endTurnBtnEnabled = this.isPlayersTurn() &&
      curPlayer.currentDiceRoll &&
      (!curPlayer.currentDiceRoll.isDouble || curPlayer.isInJail) &&
      !this.gameState.auctionInProgress &&
      !this.gameState.waitForBuyOrAuctionStart;
  }

  private canOpenBuyPropertyModal(): boolean {
    let isPropAvaliableToBuy = !this.gameState.currentTile.ownerPlayerID;
    if (isPropAvaliableToBuy && this.isPlayersTurn() && this.gameState.waitForBuyOrAuctionStart) {
      this.canAfford = this.gameState.currentPlayer.money >= this.gameState.currentTile.cost;
      return true;
    }
    return false;
  }

  private canBetOnAuction(): boolean {
    return this.gameState.auction && this.gamePlayer.money > 0 && !this.gameState.auction.auctionParticipants.find(x => x.id == this.gamePlayerId).hasPlacedBet;
  }

  private isPlayersTurn(): boolean {
    return this.gameInProgress && this.gameState.currentPlayer.id === this.gamePlayerId;
  }

  private getOtherPlayers(): Player[] {
    return this.gameState.players.filter(x => x.id != this.gamePlayerId);
  }
}

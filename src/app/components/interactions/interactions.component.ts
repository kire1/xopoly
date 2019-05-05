import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap/';
import { IconDefinition, faUser, faMoneyBillWave, faDiceOne, faDiceTwo, faDiceThree, faDiceFour, faDiceFive, faDiceSix, faUnderline } from '@fortawesome/free-solid-svg-icons';
import * as _ from 'lodash';

import { InteractionsService } from "../../services/InteractionsService";
import { GameState } from "src/app/models/game/GameState";
import { Player } from 'src/app/models/game/Player';
import { LobbyState } from 'src/app/models/lobby/LobbyState';
import { TradeOffer } from 'src/app/models/game/TradeOffer';
import { TileTypes } from '../board/board.component';
import { PlayerMoney } from 'src/app/models/game/PlayerMoney';

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
  @Input() playerMoveInProgress: boolean;

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
  goSalaryNoti: string;
  goToJailNoti: string;
  paidNoti: string;
  rollNoti: string;
  canClearEvents: boolean;
  playersMoney: PlayerMoney[];

  //dev use
  loadInstantMono: boolean = false;

  constructor(private modalService: NgbModal, private interactionsService: InteractionsService) {
    this.lastDiceRoll = [2, 2];
    this.tradeTargetPlayerSelectedProperties = [];
    this.tradeMyPlayerSelectedProperties = [];
    this.offers = [];
    this.gameLog = [];
    this.canClearEvents = true;
  }

  ngOnInit(): void {
    this.initNewLobbyState();
    this.initNewGameState();
  }

  private initNewGameState() {
    this.interactionsService.gameLogEntry().subscribe((gameLog) => {
      let newGameLog = this.colorPlayersNames(gameLog);
      if (!this.playerMoveInProgress) {
        this.gameLog = newGameLog;
        this.checkForNotifications(newGameLog);

      }
      this.checkForRollNoti(newGameLog);
    });

    this.interactionsService.rejectedTradeId().subscribe((rejectedTradeId) => {
      let rejectedOffer = this.gameState.tradeOffers.find(x => x.id == rejectedTradeId);
      if (rejectedOffer) {
        this.acceptedOffer = undefined;
        this.rejectedOffer = rejectedOffer;
      }
    });

    this.interactionsService.acceptedTradeId().subscribe((acceptedTradeId) => {
      let acceptedOffer = this.gameState.tradeOffers.find(x => x.id == acceptedTradeId);
      if (acceptedOffer) {
        this.rejectedOffer = undefined;
        this.acceptedOffer = acceptedOffer;
      }
    });

    this.interactionsService.newGameState().subscribe((newGameState) => {
      //console.log("interactions - gameState - ", newGameState);
      //console.log("newGameState - playerMoveInProgress", this.playerMoveInProgress);
      this.prevGameState = this.gameState;
      this.gameState = newGameState;
      this.gamePlayer = newGameState.players.find((p) => { return p.id === this.gamePlayerId; });
      this.gameInProgress = newGameState ? true : false;

      this.initPlayersMoney();
      this.updatePlayersMoney(newGameState);
      this.updateStates();

      if (this.loadInstantMono && this.isPlayersTurn()) {
        this.instantMono();
        this.loadInstantMono = false;
      }

      //u land on a propery
      if (this.canOpenBuyPropertyModal() && !this.propertyBuyModalRef && !this.playerMoveInProgress) {
        this.openPropertyBuyModal();
      }

      //someone else auctioned a property
      if (this.canBetOnAuction() && !this.propertyAuctionModalRef && !this.playerMoveInProgress) {
        this.closePropertyBuyModal();
        this.openPropertyAuctionModal();
      }

      if (!this.gameState.auctionInProgress || !this.canBetOnAuction()) {
        this.closePropertyAuctionModal();
      }

      if (this.playerMoveInProgress) {
        this.closePropertyBuyModal();
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
      this.checkForAuctionWinnerNoti();

      if (this.rollBtnEnabled && this.canClearEvents) {
        this.clearGameEvents();
        this.canClearEvents = false;
      }
    });
  }

  private checkForRollNoti(gameLog: string[]): void {
    if (this.gameState) {
      for (let i = 0; i < gameLog.length && i < 2; i++) {
        let gameLogEntry = gameLog[i];
        let playersFound = this.gameState.players.filter(p => gameLogEntry.includes(p.name));
        let rollNotiFound = gameLogEntry.includes("rolled");
        let startIndex = gameLogEntry.lastIndexOf(":") + 1;

        if (playersFound.length > 0) {
          startIndex = gameLogEntry.indexOf("<");
        }

        let firstDiceStartIndex = gameLogEntry.indexOf("[");
        let secondDiceStartIndex = gameLogEntry.lastIndexOf("[");

        let dice1Val= +gameLogEntry.substr(firstDiceStartIndex + 1, 1);
        let dice2Val =  +gameLogEntry.substr(secondDiceStartIndex + 1, 1);

        if (rollNotiFound) {
          this.acceptedOffer = undefined;
          this.rejectedOffer = undefined;
          this.goToJailNoti = undefined;
          this.goSalaryNoti = undefined;
          this.paidNoti = undefined;
          this.rollNoti = gameLogEntry.substring(startIndex).replace("[" + dice1Val + "],[" + dice2Val + "]", (dice1Val + dice2Val) + "");
        }else{
          this.rollNoti = undefined;
        }
      }
    }
  }

  private initPlayersMoney() {
    if (!this.playersMoney) {
      this.playersMoney = [];
      for (let player of this.gameState.players) {
        this.playersMoney.push(new PlayerMoney(player.id, player.money));
      }
    }
  }

  private updatePlayersMoney(gameState: GameState) {
    if (!this.playerMoveInProgress) {
      for (let player of gameState.players) {
        this.playersMoney.find(p => p.id === player.id).money = player.money;
      }
    }
  }

  private checkForNotifications(gameLog: string[]): void {
    if (this.gameState) {
      for (let i = 0; i < gameLog.length && i < 2; i++) {
        let gameLogEntry = gameLog[i];
        let playersFound = this.gameState.players.filter(p => gameLogEntry.includes(p.name));

        let goSalaryNotiFound = gameLogEntry.includes(" collected a salary of ");
        let goToJailNotiFound = gameLogEntry.includes(" to jail");
        let paidNotiFound = gameLogEntry.includes(" paid");

        let startIndex = gameLogEntry.lastIndexOf(":") + 1;

        if (playersFound.length > 0) {
          startIndex = gameLogEntry.indexOf("<");
        }

        if (goSalaryNotiFound) {
          this.goToJailNoti = undefined;
          this.paidNoti = undefined;
          this.goSalaryNoti = gameLogEntry.substring(startIndex);
        }

        if (goToJailNotiFound) {
          this.goSalaryNoti = undefined;
          this.paidNoti = undefined;
          this.goToJailNoti = gameLogEntry.substring(startIndex);
        }

        if (paidNotiFound) {
          this.goToJailNoti = undefined;
          this.goSalaryNoti = undefined;
          this.paidNoti = gameLog[i].substring(startIndex);
        }
      }
    }
  }

  private colorPlayersNames(gameLog: string[]): string[] {
    if (this.gameState) {
      let players = this.gameState.players;

      for (let i = 0; i < gameLog.length; i++) {
        let gameLogEntry = gameLog[i];
        let gameLogEntryTextArray = gameLogEntry.replace(/'/g, "").split(" ");
        let playersFound = players.filter(p => gameLogEntry.includes(p.name));

        for (let player of playersFound) {
          //4/28/2019 5:04:56 PM: Player jki as aas landed on St. James Place!
          let playerNameArray = player.name.split(" "); // ["jki","as","aas"]
          let nameIndexStart = gameLogEntryTextArray.indexOf(playerNameArray[0]);
          let htmlName = '<span class="Player-Background-' + player.color + '">' + player.name + '</span>';

          // ['4/28/2019', '5:04:56 PM:', 'Player', 'jki', 'as', 'aas', 'landed', 'on', 'St.', 'James', 'Place!']
          gameLogEntryTextArray.splice(nameIndexStart, playerNameArray.length, htmlName);
          // ['<span class="Player-Background-Red">jki as aas</span>', 'landed', 'on', 'St.', 'James', 'Place!']
        }

        gameLog[i] = gameLogEntryTextArray.join(" ");
      }
    }

    return gameLog;
  }

  private checkForAuctionWinnerNoti(): void {
    if (this.prevGameState && this.gameState) {
      if (this.prevGameState.auction && !this.gameState.auction) {
        let auctionedProperty = this.gameState.tiles.find(t => t.id == this.prevGameState.currentTile.id);
        let auctionWinner = this.gameState.players.find(x => x.id == auctionedProperty.ownerPlayerID);
        let auctionWinnerBetAmount = this.prevGameState.players.find(x => auctionWinner && x.id == auctionWinner.id).money - auctionWinner.money;
        this.msgAuctionWinner = '<span class="Player-Background-' + auctionWinner.color + '">' + auctionWinner.name + '</span>' + " won the auction for " + auctionedProperty.name + " in the amount of $" + auctionWinnerBetAmount + "!";
      } else if (this.gameState.auction) {
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
      this.acceptedOffer = undefined;
      this.rejectedOffer = undefined;
      this.goToJailNoti = undefined;
      this.goSalaryNoti = undefined;
      this.paidNoti = undefined;
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
        this.clearGameEvents();
        this.canClearEvents = true;
      });
    }
  }

  private clearGameEvents() {
    this.rejectedOffer = undefined;
    this.acceptedOffer = undefined;
    this.msgAuctionWinner = undefined;
    this.goToJailNoti = undefined;
    this.goSalaryNoti = undefined;
    this.paidNoti = undefined;
  }

  declareBankruptcy(): void {
    if (this.isPlayersTurn() && this.gamePlayer.money < 0 && !this.playerMoveInProgress) {
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

  getMoney(playerId: string): number {
    return this.playersMoney.find(p => p.id === playerId).money;
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
          this.tradePlayers = this.gameState.players.filter(p => p.id !== this.gamePlayerId && !pendingTradesIds.some(id => id === p.id));
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
      this.offers.length > 0 && !this.playerMoveInProgress;
  }

  private canTrade(): void {
    let otherPlayers = this.getOtherPlayers();
    this.tradeBtnEnabled = this.gamePlayer &&
      this.gamePlayer.money > 0 &&
      otherPlayers && otherPlayers.length > 0;
  }

  private canBuild(): void {
    let ownedProperties = this.getOwnedProperties(this.gamePlayerId);
    let canBuild = false;

    if (this.isPlayersTurn() && !this.playerMoveInProgress && ownedProperties.length > 1) {
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

    if (this.isPlayersTurn() && !this.playerMoveInProgress && ownedProperties.length > 1) {
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
      !this.gameState.auctionInProgress && !this.playerMoveInProgress;

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
      !this.playerMoveInProgress &&
      ownedProperties.length > 0 &&
      (ownedProperties.some(x => x.isMortgaged)));
  }

  private canPayJailFee(): void {
    this.payJailFeeBtnEnabled = this.isPlayersTurn() &&
      this.gameState.currentPlayer.isInJail
      && !this.gameState.currentPlayer.currentDiceRoll && !this.playerMoveInProgress;
  }

  private canGetOutOfJailFree(): void {
    this.getOutOfJailFreeBtnEnabled = this.isPlayersTurn() &&
      this.gameState.currentPlayer.isInJail &&
      this.gameState.currentPlayer.hasGetOutOfJailFreeCard  && 
      !this.gameState.currentPlayer.currentDiceRoll && !this.playerMoveInProgress;
  }

  private canRollDice(): void {
    this.rollBtnEnabled = this.isPlayersTurn() &&
      !this.gameState.waitForBuyOrAuctionStart &&
      this.gameState.currentPlayer.money >= 0 &&
      (!this.gameState.currentPlayer.currentDiceRoll || (this.gameState.currentPlayer.currentDiceRoll.isDouble && !this.gameState.currentPlayer.isInJail)) &&
      !this.gameState.auctionInProgress && !this.playerMoveInProgress;
  }

  private canEndTurn(): void {
    let curPlayer = this.gameState.currentPlayer;
    this.endTurnBtnEnabled = this.isPlayersTurn() &&
      curPlayer.currentDiceRoll &&
      (!curPlayer.currentDiceRoll.isDouble || curPlayer.isInJail) &&
      !this.gameState.auctionInProgress &&
      !this.gameState.waitForBuyOrAuctionStart &&
      !this.playerMoveInProgress;
  }

  private canOpenBuyPropertyModal(): boolean {
    let isPropAvaliableToBuy = !this.gameState.currentTile.ownerPlayerID;
    if (isPropAvaliableToBuy && this.isPlayersTurn() && this.gameState.waitForBuyOrAuctionStart && this.gameState.currentPlayer.currentTurnElapsedSeconds != 0) {
      this.canAfford = this.gameState.currentPlayer.money >= this.gameState.currentTile.cost;
      return true;
    }
    return false;
  }

  private canBetOnAuction(): boolean {
    return this.gameState.auction && this.gamePlayer.money > 0 && this.gameState.auction.auctionParticipants.some(x => x.id === this.gamePlayerId) && !this.gameState.auction.auctionParticipants.find(x => x.id === this.gamePlayerId).hasPlacedBet;
  }

  private isPlayersTurn(): boolean {
    return this.gameInProgress && this.gameState.currentPlayer.id === this.gamePlayerId;
  }

  private getOtherPlayers(): Player[] {
    return this.gameState.players.filter(x => x.id != this.gamePlayerId);
  }
}
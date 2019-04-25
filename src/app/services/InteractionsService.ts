import { OnInit, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { skip } from 'rxjs/operators';

import { GameEngineService } from '../services/GameEngineService';

@Injectable()
export class InteractionsService implements OnInit {

  constructor(private gameEngine: GameEngineService) {
  }

  ngOnInit(): void {
  }

  sendTrade(tradeTargetPlayerID: string,
    selectedTradeMyPlayerProperties: any[],
    selectedTradeTargetPlayerProperties: any[],
    selectedTradeMyPlayerMoney: number,
    selectedTradeTargetPlayerMoney: number): Observable<any> {
    return this.gameEngine.invoke("offerTrade", tradeTargetPlayerID, selectedTradeMyPlayerProperties, selectedTradeTargetPlayerProperties, selectedTradeMyPlayerMoney || 0, selectedTradeTargetPlayerMoney || 0);
  }

  rollDice(): Observable<any> {
    return this.gameEngine.invoke("rollDice");
  }

  buyProperty(): Observable<any> {
    return this.gameEngine.invoke("buyProperty");
  }

  startAuctionOnProperty(): Observable<any> {
    return this.gameEngine.invoke("startAuctionOnProperty");
  }

  endTurn(): Observable<any> {
    return this.gameEngine.invoke("endTurn");
  }

  betOnAuction(amount: number): Observable<any> {
    return this.gameEngine.invoke("betOnAuction", amount);
  }

  mortgageProperty(propertyId: number): Observable<any> {
    return this.gameEngine.invoke("mortgageProperty", propertyId);
  }

  redeemProperty(propertyId: number): Observable<any> {
    return this.gameEngine.invoke("redeemProperty", propertyId);
  }

  buildProperty(propertyId: number): Observable<any> {
    return this.gameEngine.invoke("buildHouse", propertyId);
  }

  acceptTrade(tradeOfferID: string): Observable<any> {
    return this.gameEngine.invoke("acceptTrade", tradeOfferID);
  }

  rejectTrade(tradeOfferID: string): Observable<any> {
    return this.gameEngine.invoke("rejectTrade", tradeOfferID);
  }

  payJailFee(): Observable<any> {
    return this.gameEngine.invoke("buyOutOfJail");
  }

  useGetOutOfJailFreeCard() {
    return this.gameEngine.invoke("useGOOJFC");
  }

  instantMono() {
    return this.gameEngine.invoke("instantMonopoly");
  }

  sellProperty(propertyId: number): Observable<any> {
    return this.gameEngine.invoke("sellHouse", propertyId);
  }

  declareBankruptcy(): Observable<any> {
    return this.gameEngine.invoke("declareBankruptcy");
  }

  newGameState(): Observable<any> {
    return this.gameEngine.gameState.pipe(skip(1));
  }

  newLobbyState(): Observable<any> {
    return this.gameEngine.lobbyState.pipe(skip(1));
  }

  hubConnected(): Observable<any> {
    return this.gameEngine.hubConnected;
  }

  turnOnWeightedDice(): Observable<any> {
    return this.gameEngine.invoke("turnOnWeightedDice", arguments);
  }
  turnOffWeightedDice(): Observable<any> {
    return this.gameEngine.invoke("turnOffWeightedDice");
  }
}
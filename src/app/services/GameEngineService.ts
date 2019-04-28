import { Injectable } from '@angular/core';
import * as signalR from "@aspnet/signalr";
import { Observable, Subject, BehaviorSubject, from } from 'rxjs';
import { first } from 'rxjs/operators';

import { LobbyState } from '../models/lobby/LobbyState';
import { GameState } from '../models/game/GameState';

@Injectable()
export class GameEngineService {
  private hubConnection: signalR.HubConnection;
  private hubConnected: Subject<boolean> = new BehaviorSubject<boolean>(false);
  private lobbyState: Subject<LobbyState> = new BehaviorSubject<LobbyState>(null);
  private gameState: Subject<GameState> = new BehaviorSubject<GameState>(null);
  private rejectedTradeId: Subject<string> = new BehaviorSubject<any>("");
  private acceptedTradeId: Subject<string> = new BehaviorSubject<any>("");
  private gameLogEntry: Subject<string> = new BehaviorSubject<any>("");

  hubConnected$ = this.hubConnected.asObservable();
  lobbyState$ = this.lobbyState.asObservable();
  gameState$ = this.gameState.asObservable();
  rejectedTradeId$ = this.rejectedTradeId.asObservable();
  acceptedTradeId$ = this.acceptedTradeId.asObservable();
  gameLogEntry$ = this.gameLogEntry.asObservable();

  constructor() {
    this.start("https://localhost:5001/lobbyhub");
    //this.start("https://nd427406.prog1.com:98/xopolycorep/lobbyhub");
  }

  private start(url: string): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .build();

    this.hubConnection.on("updateState", (newlobbyState) => {
      this.lobbyState.next(newlobbyState);
    });
    
    this.hubConnection.on("rejectedTrade", (tradeId) => {
      this.rejectedTradeId.next(tradeId);
    });

    this.hubConnection.on("acceptedTrade", (tradeId) => {
      this.acceptedTradeId.next(tradeId);
    });

    this.hubConnection.on("updateGameState", (newGameState) => {
      this.gameState.next(newGameState);
    });

    this.hubConnection.on("updateGameLog", (log) => {
      this.gameLogEntry.next(log);
    });

    this.hubConnection
      .start()
      .then(() => { this.hubConnected.next(true); console.log('GameEngineService Connected Successfully') })
      .catch(err => { this.hubConnected.next(false); console.log('GameEngineService Connected Error', err) })
  }

  invoke(methodName: string, ...args: any[]): Observable<any> {
    return from(this.hubConnection.invoke(methodName, ...args)).pipe(first());
  }
}
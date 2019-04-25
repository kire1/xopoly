import { OnInit, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { skip } from 'rxjs/operators';

import { GameEngineService } from '../services/GameEngineService';

@Injectable()
export class LobbyService implements OnInit {

  constructor(private gameEngine: GameEngineService) {
  }

  ngOnInit(): void {
  }

  registerPlayer(playerName: string): Observable<any> {
    return this.gameEngine.invoke("registerPlayer", playerName);
  }

  disconnectPlayer(): Observable<any>  {
    return this.gameEngine.invoke("disconnectPlayer");
  }

  createLobby(lobbyName: string, isPublic: boolean): Observable<any> {
    return this.gameEngine.invoke("createLobby", lobbyName, isPublic);
  }

  joinLobby(lobbyId: string): Observable<any> {
      return this.gameEngine.invoke("joinLobby", lobbyId);
  }

  leaveLobby(): Observable<any> {
      return this.gameEngine.invoke("disconnectFromLobby");
  }

  spectateLobby(lobbyId: string): Observable<any> {
    return this.gameEngine.invoke("spectateLobby", lobbyId);
  }

  startGame(): Observable<any> {
    return this.gameEngine.invoke("startGame");
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
}
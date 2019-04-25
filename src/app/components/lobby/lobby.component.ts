import { Component, ViewEncapsulation, OnInit, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { faPlus, faTimesCircle, faSignInAlt, faUsers, faSignOutAlt, faUser, faEye, IconDefinition, faUserCircle, faPlay, faCaretSquareDown, faCaretSquareUp } from '@fortawesome/free-solid-svg-icons';

import { LobbyService } from "../../services/LobbyService";
import { LobbyState } from 'src/app/models/lobby/LobbyState';

@Component({
  selector: 'lobby',
  templateUrl: './lobby.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  private addPlayerModal: NgbModalRef;
  private addLobbyModal: NgbModalRef;

  faPlus: IconDefinition = faPlus;
  faTimesCircle: IconDefinition = faTimesCircle;
  faSignInAlt: IconDefinition = faSignInAlt;
  faSignOutAlt: IconDefinition = faSignOutAlt;
  faEye: IconDefinition = faEye;
  faUser: IconDefinition = faUser;
  faUsers: IconDefinition = faUsers;
  faUserCircle: IconDefinition = faUserCircle;
  faPlay: IconDefinition = faPlay;
  faCaretSquareDown: IconDefinition = faCaretSquareDown;
  faCaretSquareUp: IconDefinition = faCaretSquareUp;

  isPlayerRegistered: boolean;
  isPlayerInLobby: boolean;
  lobbyState: LobbyState;

  isLobbyCollapsed: boolean;
  gameInProgress: boolean;
  manuallyOpenedLobby: boolean;

  constructor(private modalService: NgbModal, private lobbyService: LobbyService) {
    this.lobbyState = new LobbyState();
  }

  ngOnInit(): void {
    this.lobbyService.hubConnected().subscribe((isHubConnected) => {
      if (isHubConnected) {
        this.loadLocalPlayer();
      }
    });

    this.lobbyService.newLobbyState().subscribe((newLobbyState) => {
      this.lobbyState = newLobbyState;
    });

    this.lobbyService.newGameState().subscribe((newGameState) => {
      this.gameInProgress = newGameState ? true : false;
      if (this.isLobbyCollapsed || (this.gameInProgress && !this.manuallyOpenedLobby)) {
        this.isLobbyCollapsed = false;
        this.toggleLobby();
      }
    });
  }

  private storeLocalPlayer(): void {
    localStorage.setItem("player_name", this.lobbyState.player ? this.lobbyState.player.username : "");
  }

  private loadLocalPlayer(): void {
    let playerName = localStorage.getItem("player_name");
    if (playerName && playerName != "") {
      this.registerPlayer(playerName);
    }
  }

  private clearLocalPlayer(): void {
    localStorage.removeItem("player_name");
  }

  openAddPlayerModal(content: any) {
    if (!this.isPlayerRegistered) {
      this.addPlayerModal = this.modalService.open(content);
      this.isLobbyCollapsed = false;
    }
  }

  openAddLobbyModal(content: any) {
    if (!this.isPlayerInLobby) {
      this.addLobbyModal = this.modalService.open(content);
      this.isLobbyCollapsed = false;
    }
  }

  registerPlayer(playerName: string) {
    if (playerName != '') {
      this.lobbyService.registerPlayer(playerName).subscribe(() => {
        if (this.addPlayerModal) {
          this.addPlayerModal.close();
        }
        this.addPlayerModal = undefined;
        this.isPlayerRegistered = true;
        this.storeLocalPlayer();
      });
    }
  }

  disconnectPlayer() {
    this.lobbyService.disconnectPlayer().subscribe(() => {
      this.resetLobby();
      this.clearLocalPlayer();
    });
  }

  canLeaveLobby(lobbyId: string): boolean {
    let lobby = this.lobbyState.lobbies.find((l) => { return l.id === lobbyId });
    let playerFound = false;
    let ownerOfLobby = false;

    if (lobby) {
      ownerOfLobby = this.lobbyState.player.computerUserID === lobby.owner.computerUserID;
      playerFound = (lobby.players.find((p) => { return p.computerUserID === this.lobbyState.player.computerUserID })) ? true : false;
    }
    return playerFound || ownerOfLobby;
  }

  createLobby(data: any): void {
    if (data.lobbyName != '') {
      this.lobbyService.createLobby(data.lobbyName, data.isPublic).subscribe(() => {
        if (this.addLobbyModal) {
          this.addLobbyModal.close();
        }
        this.addLobbyModal = undefined;
        this.isPlayerInLobby = true;
      });
    }
  }

  leaveLobby(lobbyId: string): void {
    if (this.canLeaveLobby(lobbyId)) {
      this.lobbyService.leaveLobby().subscribe(() => {
        this.isPlayerInLobby = false;
        this.gameInProgress = false;
      });
    }
  }

  joinLobby(lobbyId: string, lobbyJoinable: boolean): void {
    if (lobbyJoinable) {
      this.lobbyService.joinLobby(lobbyId).subscribe(() => {
        this.isPlayerInLobby = true;
      });
    }
  }

  spectateLobby(lobbyId: string): void {
    this.lobbyService.spectateLobby(lobbyId).subscribe(() => {
      this.isPlayerInLobby = true;
      this.isLobbyCollapsed = true;
    });
  }

  startGame(lobbyId: string): void {
    if (this.canStartGame(lobbyId)) {
      this.lobbyService.startGame().subscribe(() => {
        this.isLobbyCollapsed = true;
      });
    }
  }

  toggleLobby(): void {
    this.isLobbyCollapsed = !this.isLobbyCollapsed;
    this.manuallyOpenedLobby = !this.manuallyOpenedLobby && !this.isLobbyCollapsed;
  }


  private canStartGame(lobbyId: string) {
    let start = false;
    let lobby = this.lobbyState.lobbies.find((l) => { return l.id === lobbyId });
    if (lobby) {
      start = lobby.owner.computerUserID === this.lobbyState.player.computerUserID && !this.gameInProgress;
    }
    return start;
  }

  private resetLobby() {
    this.addLobbyModal = undefined;
    this.addPlayerModal = undefined;
    this.isPlayerRegistered = false;
    this.isPlayerInLobby = false;
    this.isLobbyCollapsed = false;
    this.lobbyState = new LobbyState();
  }
}
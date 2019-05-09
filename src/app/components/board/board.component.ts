import { Component, OnInit, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { skip } from 'rxjs/operators';
import { IconDefinition, faLongArrowAltLeft, faQuestion, faCube, faSubway, faLightbulb, faGem, faTint, faGavel, faCar, faHome, faHotel } from '@fortawesome/free-solid-svg-icons';
import { faCreativeCommonsNc } from '@fortawesome/free-brands-svg-icons';
import * as _ from 'lodash';

import { InteractionsService } from "../../services/InteractionsService";
import { GameState } from "src/app/models/game/GameState";
import { Player } from 'src/app/models/game/Player';
import { LobbyState } from 'src/app/models/lobby/LobbyState';

export enum TileTypes {
  MortgageProperty = 'MortgageProperty',
  RedeemProperty = 'RedeemProperty',
  BuildHouse = 'BuildHouse',
  SellHouse = 'SellHouse',
  ColorProperty = 'ColorProperty',
  Chance = 'Chance',
  Railroad = 'Railroad',
  CommunityChest = 'CommunityChest',
  None = "None",
  Utility = "Utilities"
}

@Component({
  selector: 'board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  encapsulation: ViewEncapsulation.Native
})
export class BoardComponent implements OnInit {
  @ViewChild('propertyViewModalContent') propertyViewModalContent: ElementRef;

  private propertyViewModal: NgbModalRef;
  propertyForPropertyViewModal: any;
  nonPropertyTileId = [0, 2, 4, 7, 10, 17, 20, 22, 30, 33, 36, 38];

  faCreativeCommonsNc: IconDefinition = faCreativeCommonsNc;
  faLongArrowAltLeft: IconDefinition = faLongArrowAltLeft;
  faQuestion: IconDefinition = faQuestion;
  faCube: IconDefinition = faCube;
  faSubway: IconDefinition = faSubway;
  faLightbulb: IconDefinition = faLightbulb;
  faGem: IconDefinition = faGem;
  faTint: IconDefinition = faTint;
  faGavel: IconDefinition = faGavel;
  faCar: IconDefinition = faCar;
  faHome: IconDefinition = faHome;
  faHotel: IconDefinition = faHotel;

  playerId: string;
  gamePlayerId: string;
  gameState: GameState;
  lobbyState: LobbyState;
  gamePlayer: Player;
  playersToMove: Player[];
  propertySelectionType: string;
  propertiesTopRow: any[];
  propertiesBottomRow: any[];
  propertiesLeftRow: any[];
  propertiesRightRow: any[];

  updateGameState = true;
  playerMoveInProgress: boolean = false;

  constructor(private modalService: NgbModal, private interactionsService: InteractionsService) {
  }

  ngOnInit(): void {
    this.interactionsService.newLobbyState().subscribe((newLobbyState) => {
      this.lobbyState = newLobbyState;
      this.playerId = newLobbyState.player.computerUserID;
      this.gamePlayerId = newLobbyState.player.gameID;

      let lobby = newLobbyState.lobbies.find((l) => {
        return l.players.find((p) => {
          return p.computerUserID === newLobbyState.player.computerUserID;
        }) != undefined;
      });

      if (!lobby) {
        this.gameState = undefined;
      }
    });

    this.interactionsService.newGameState().subscribe((newGameState) => {
      this.gameState = newGameState;
      this.gamePlayer = newGameState.players.find(p => p.id === this.gamePlayerId);

      this.movePlayers(newGameState);

      if (!this.propertiesTopRow) {
        this.propertiesTopRow = this.gameState.tiles.slice(21, 30);
      }

      if (!this.propertiesBottomRow) {
        this.propertiesBottomRow = this.gameState.tiles.slice(1, 10).reverse();
      }

      if (!this.propertiesLeftRow) {
        this.propertiesLeftRow = this.gameState.tiles.slice(11, 20).reverse();
      }

      if (!this.propertiesRightRow) {
        this.propertiesRightRow = this.gameState.tiles.slice(31, 40);
      }
    });
  }

  getTileClasses(propertyId: number): string {
    let property = this.gameState.tiles.find((p) => { return p.id === propertyId });
    let tileClass = "";

    if (property) {
      this.updateMyProperty(property);

      if (property.ownerPlayerID) {
        tileClass += " Player-Background-" +
          this.gameState.players.filter(p => p.id === property.ownerPlayerID)[0].color;
      }

      if (this.propertySelectionType) {
        if (property.ownerPlayerID === this.gamePlayerId &&
          (this.canMortgageTile(property) && this.propertySelectionType === TileTypes.MortgageProperty) ||
          (property.isMortgaged && property.ownerPlayerID === this.gamePlayerId && this.propertySelectionType === TileTypes.RedeemProperty) ||
          (this.canBuildTile(property) && this.propertySelectionType === TileTypes.BuildHouse) ||
          (property.ownerPlayerID === this.gamePlayerId && property.buildingCount > 0 && this.propertySelectionType === TileTypes.SellHouse)) {
          tileClass += " selectable";
        } else {
          tileClass += " unselectable";
        }
      } else {
        let isNonPropTile = this.nonPropertyTileId.some((id) => { return id === propertyId })
        if (!isNonPropTile) {
          tileClass += " property-veiw-selectable";
        }
      }

      if (property.type === TileTypes.ColorProperty) {
        tileClass += " property";
      } else if (property.type === TileTypes.Chance) {
        tileClass += " chance";
      } else if (property.type === TileTypes.Railroad) {
        tileClass += " railroad";
      } else if (property.type === TileTypes.CommunityChest) {
        tileClass += " community-chest";
      } else if (property.type === TileTypes.Utility) {
        tileClass += " utility";
      }else if (property.name === "Income Tax") {
        tileClass += " fee income-tax";
      } else if (property.name === "Luxury Tax") {
        tileClass += " fee luxury-tax";
      }
    }

    return tileClass;
  }

  private movePlayers(gameState: GameState): void {
    if (!this.playersToMove || this.playersToMove.length != gameState.players.length) {
      this.playersToMove = gameState.players;
    }

    let currentGamePlayer = gameState.currentPlayer;
    let myGamePlayer = this.playersToMove.find(p => p.id == currentGamePlayer.id);

    if (myGamePlayer.boardPosition !== currentGamePlayer.boardPosition && !this.playerMoveInProgress) {
      this.playerMoveInProgress = true;
      let timeMS = 250;
      let targetPos = currentGamePlayer.boardPosition;
      let currentPos = myGamePlayer.boardPosition;
      let card = gameState.chanceDeck.currentPlayerCardText || gameState.communityChestDeck.currentPlayerCardText;
      let moveBackwards = false;


      if (card) {
        if (card.includes("Advance") || card.includes("Take a trip to")) {
          timeMS = 120;
        } else if (card.includes("Go Back")) {
          moveBackwards = true;
        }

        if (card.includes("nearest Utility.") && currentPos === 36) {
          moveBackwards = true;
        } else if (card.includes("nearest Railroad.") && (currentPos === 7 || currentPos === 36)) {
          moveBackwards = true;
        }
      }

      (async () => {
        while (currentPos != targetPos) {

          this.playerMoveInProgress = true;
          // valid position 0-39
          //    -1 | 0-39 | 40
          if (moveBackwards) {
            currentPos--;
            if (currentPos < 0) {
              currentPos = 39;
            }
          } else {
            currentPos++;
            if (currentPos > 39) {
              currentPos = 0;
            }
          }

          //lands on go to jail
          if (currentGamePlayer.isInJail) {
            currentPos = 10;
            targetPos = 10;
            this.playersToMove.find(p => p.id === currentGamePlayer.id).boardPosition = targetPos;
          }
          else {
            this.playersToMove.find(p => p.id === currentGamePlayer.id).boardPosition = currentPos;
          }
          await this.delay(timeMS);
        }
        //updateMyplayer
        let index = this.playersToMove.findIndex(p => p.id === currentGamePlayer.id);
        if (index >= 0) {
          this.playersToMove[index] = currentGamePlayer;
        }
        this.playerMoveInProgress = false;
      })();
    }
  }


  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateMyProperty(property: any) {
    if (property) {
      if (this.propertiesTopRow.some(p => p.id === property.id)) {
        let index = this.propertiesTopRow.findIndex(p => p.id === property.id);
        let myProperty = this.propertiesTopRow.find(p => p.id === property.id);
        if (!(_.isEqual(myProperty, property)) && index >= 0) {
          this.propertiesTopRow[index] = property;
        }
      }

      if (this.propertiesBottomRow.some(p => p.id === property.id)) {
        let index = this.propertiesBottomRow.findIndex(p => p.id === property.id);
        let myProperty = this.propertiesBottomRow.find(p => p.id === property.id);
        if (!(_.isEqual(myProperty, property)) && index >= 0) {
          this.propertiesBottomRow[index] = property;
        }
      }

      if (this.propertiesLeftRow.some(p => p.id === property.id)) {
        let index = this.propertiesLeftRow.findIndex(p => p.id === property.id);
        let myProperty = this.propertiesLeftRow.find(p => p.id === property.id);
        if (!(_.isEqual(myProperty, property)) && index >= 0) {
          this.propertiesLeftRow[index] = property;
        }
      }

      if (this.propertiesRightRow.some(p => p.id === property.id)) {
        let index = this.propertiesRightRow.findIndex(p => p.id === property.id);
        let myProperty = this.propertiesRightRow.find(p => p.id === property.id);
        if (!(_.isEqual(myProperty, property)) && index >= 0) {
          this.propertiesRightRow[index] = property;
        }
      }
    }
  }

  handlePropertyClick(property: any): void {
    if (!this.propertySelectionType) {
      let isNonPropTile = this.nonPropertyTileId.some((id) => { return id === property.id });
      if (!isNonPropTile) {
        this.openPropertyViewModal(property);
      }
    } else {
      if (this.propertySelectionType === TileTypes.MortgageProperty) {
        if (this.canMortgageTile(property)) {
          this.mortgageProperty(property.id);
        }
      } else if (this.propertySelectionType === TileTypes.RedeemProperty) {
        this.reedemProperty(property.id);
      } else if (this.propertySelectionType === TileTypes.BuildHouse) {
        if (this.canBuildTile(property)) {
          this.buildProperty(property.id);
        }
      } else if (this.propertySelectionType === TileTypes.SellHouse) {
        this.sellProperty(property.id);
      }
    }
  }

  getBuildingCountArray(numberOfHouses: number): number[] {
    return new Array(numberOfHouses);
  }

  private mortgageProperty(propertyId: number): void {
    this.interactionsService.mortgageProperty(propertyId).subscribe(() => {
    });
  }

  private reedemProperty(propertyId: number): void {
    this.interactionsService.redeemProperty(propertyId).subscribe(() => {
    });
  }

  private buildProperty(propertyId: number): void {
    this.interactionsService.buildProperty(propertyId).subscribe(() => {
    });
  }

  private sellProperty(propertyId: number): void {
    this.interactionsService.sellProperty(propertyId).subscribe(() => {
    });
  }

  closePropertyViewModal(): void {
    if (this.propertyViewModal) {
      this.propertyViewModal.close();
      this.propertyViewModal = undefined;
      this.propertyForPropertyViewModal = undefined;
    }
  }

  startViewPropertySelection(type: string): void {
    if (type === TileTypes.MortgageProperty) {
      this.propertySelectionType = TileTypes.MortgageProperty;
    } else if (type === TileTypes.RedeemProperty) {
      this.propertySelectionType = TileTypes.RedeemProperty;
    } else if (type === TileTypes.BuildHouse) {
      this.propertySelectionType = TileTypes.BuildHouse;
    } else if (type === TileTypes.SellHouse) {
      this.propertySelectionType = TileTypes.SellHouse;
    } else if (type === TileTypes.None) {
      this.propertySelectionType = undefined;
    }
  }

  private canMortgageTile(property: any): boolean {
    let ownedProperties = this.playerOwnedProperties();
    let canMortgage = !property.isMortgaged && (!property.buildingCount || property.buildingCount === 0);

    if (property.color && property.ownerPlayerID === this.gamePlayerId && ownedProperties.length > 1) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type === 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');

      if (coloredProperties[property.color].some(prop => prop.buildingCount > 0))
        canMortgage = false;
    }

    return canMortgage;
  }

  private canBuildTile(property: any): boolean {
    let ownedProperties = this.playerOwnedProperties();
    let canBuild = false;

    if (property.color && property.ownerPlayerID === this.gamePlayerId && ownedProperties.length > 1 && property.buildingCount < 5) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type === 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');
      canBuild = coloredProperties[property.color].every(prop => prop.ownerPlayerID === this.gamePlayerId && !prop.isMortgaged && this.gamePlayer.money >= prop.buildingCost);
    }

    return canBuild;
  }

  private playerOwnedProperties(): any[] {
    let ownedProps = [];
    if (this.gamePlayerId != null && this.gameState.tiles) {
      ownedProps = this.gameState.tiles.filter(t => t.ownerPlayerID === this.gamePlayerId)
    }
    return ownedProps;
  }

  private openPropertyViewModal(property: any): void {
    this.propertyForPropertyViewModal = property;
    if (!this.propertyViewModal && this.propertyForPropertyViewModal) {
      this.propertyViewModal = this.modalService.open(this.propertyViewModalContent, { centered: true });
      this.propertyViewModal.result.then(() => {
      }, (reason) => {
        this.closePropertyViewModal();
      });
    }
  }
}
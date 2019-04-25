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
  MortgageProperty = 'MortgageProperty', RedeemProperty = 'RedeemProperty', BuildHouse = 'BuildHouse',
  SellHouse = 'SellHouse', ColorProperty = 'ColorProperty', Chance = 'Chance', Railroad = 'Railroad', CommunityChest = 'CommunityChest'
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
  propertySelectionInProgress: boolean;
  propertySelectionType: string;

  updateGameState = true;

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
      if (this.updateGameState) {
        this.gameState = newGameState;
        this.gamePlayer = newGameState.players.find((p) => { return p.id === this.gamePlayerId });

        if (!this.gameState.currentPlayer.currentDiceRoll) {
          // currentPlayer rolled
          
        }
      }
    });
  }

  getTileClasses(propertyId: number): string {
    let property = this.gameState.tiles.find((p) => { return p.id === propertyId });
    let tileClass = "";

    if (property) {

      if (property.ownerPlayerID) {
        tileClass += " Player-Background-" +
          this.gameState.players.filter(p => p.id == property.ownerPlayerID)[0].color;
      }

      if (this.propertySelectionInProgress) {
        if (property.ownerPlayerID == this.gamePlayerId &&
          (this.canMortgageTile(property) && this.propertySelectionType == TileTypes.MortgageProperty) ||
          (property.isMortgaged && property.ownerPlayerID == this.gamePlayerId && this.propertySelectionType == TileTypes.RedeemProperty) ||
          (this.canBuildTile(property) && this.propertySelectionType == TileTypes.BuildHouse) ||
          (property.ownerPlayerID == this.gamePlayerId && property.buildingCount > 0 && this.propertySelectionType == TileTypes.SellHouse)) {
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

      if (property.type == TileTypes.ColorProperty) {
        tileClass += " property";
      } else if (property.type == TileTypes.Chance) {
        tileClass += " chance";
      } else if (property.type == TileTypes.Railroad) {
        tileClass += " railroad";
      } else if (property.type == TileTypes.CommunityChest) {
        tileClass += " community-chest";
      } else if (property.name == "Income Tax") {
        tileClass += " fee income-tax";
      } else if (property.name == "Luxury Tax") {
        tileClass += " fee luxury-tax";
      }
    }

    return tileClass;
  }

  handlePropertyClick(property: any): void {
    if (!this.propertySelectionInProgress) {
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

  startMortgageViewPropertySelection(start: boolean): void {
    this.propertySelectionInProgress = start;
    this.propertySelectionType = TileTypes.MortgageProperty;
  }

  startRedeemViewPropertySelection(start: boolean): void {
    this.propertySelectionInProgress = start;
    this.propertySelectionType = TileTypes.RedeemProperty;
  }

  startBuildViewPropertySelection(start: boolean): void {
    this.propertySelectionInProgress = start;
    this.propertySelectionType = TileTypes.BuildHouse;
  }

  startSellViewPropertySelection(start: boolean): void {
    this.propertySelectionInProgress = start;
    this.propertySelectionType = TileTypes.SellHouse;
  }

  private canMortgageTile(property: any): boolean {
    let ownedProperties = this.playerOwnedProperties();
    let canMortgage = !property.isMortgaged && (!property.buildingCount || property.buildingCount == 0);

    if (property.color && property.ownerPlayerID == this.gamePlayerId && ownedProperties.length > 1) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type == 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');

      if (coloredProperties[property.color].some(prop => prop.buildingCount > 0))
        canMortgage = false;
    }

    return canMortgage;
  }

  private canBuildTile(property: any): boolean {
    let ownedProperties = this.playerOwnedProperties();
    var canBuild = false;

    if (property.color && property.ownerPlayerID == this.gamePlayerId && ownedProperties.length > 1 && property.buildingCount < 5) {
      let coloredProperties = this.gameState.tiles.filter(x => x.type == 'ColorProperty');
      coloredProperties = _.groupBy(coloredProperties, 'color');
      canBuild = coloredProperties[property.color].every(prop => prop.ownerPlayerID == this.gamePlayerId && !prop.isMortgaged);
    }

    return canBuild;
  }

  private playerOwnedProperties(): any[] {
    let ownedProps = [];
    if (this.gamePlayerId != null && this.gameState.tiles) {
      ownedProps = this.gameState.tiles.filter(t => t.ownerPlayerID == this.gamePlayerId)
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
import { LobbyPlayer } from "./LobbyPlayer";
import { Lobby } from "./Lobby";

export class LobbyState {
    lobbies: Lobby[];
    players: LobbyPlayer[];
    player: LobbyPlayer;
}
import { LobbyPlayer } from "./LobbyPlayer";

export class Lobby {
    players: LobbyPlayer[];
    id: string;
    name: string;
    maxPlayers: number;
    open: boolean;
    owner: LobbyPlayer;
    public: boolean;
}
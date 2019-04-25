import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AppComponent } from './app.component';
import { BoardComponent } from './components/board/board.component';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameEngineService } from './services/GameEngineService';
import { InteractionsService } from './services/InteractionsService';
import { LobbyService } from './services/LobbyService';
import { InteractionsComponent } from './components/interactions/interactions.component';

@NgModule({
  declarations: [
    AppComponent,
    LobbyComponent,
    BoardComponent,
    InteractionsComponent
  ],
  imports: [
    NgbModule,
    BrowserModule,
    FontAwesomeModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    GameEngineService,
    LobbyService,
    InteractionsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

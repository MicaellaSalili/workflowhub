import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { DocumentComment, DocumentItem } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  
  // Reactive Signals for UI state
  public isConnected = signal<boolean>(false);
  public activeUsers = signal<number>(1);
  public lastEventTimestamp = signal<Date | null>(null);

  // Observable event streams
  public documentStatusChanged$ = new Subject<{ document: DocumentItem; note: string }>();
  public newDocumentSubmitted$ = new Subject<DocumentItem>();
  public commentAdded$ = new Subject<{ documentId: string; comment: DocumentComment }>();
  public notification$ = new Subject<{ title: string; message: string; type: string }>();

  public startConnection(): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/documents', {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerServerHandlers();

    this.hubConnection
      .start()
      .then(() => {
        this.isConnected.set(true);
        console.log('[SignalR] Connected successfully to DocumentHub WebSocket.');
      })
      .catch(err => {
        this.isConnected.set(false);
        console.error('[SignalR] Connection error:', err);
      });

    this.hubConnection.onreconnecting(() => {
      this.isConnected.set(false);
      console.warn('[SignalR] Reconnecting to WebSocket...');
    });

    this.hubConnection.onreconnected(() => {
      this.isConnected.set(true);
      console.log('[SignalR] Reconnected to WebSocket.');
    });

    this.hubConnection.onclose(() => {
      this.isConnected.set(false);
      console.log('[SignalR] Connection closed.');
    });
  }

  private registerServerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('DocumentStatusChanged', (document: DocumentItem, note: string) => {
      this.lastEventTimestamp.set(new Date());
      this.documentStatusChanged$.next({ document, note });
    });

    this.hubConnection.on('NewDocumentSubmitted', (document: DocumentItem) => {
      this.lastEventTimestamp.set(new Date());
      this.newDocumentSubmitted$.next(document);
    });

    this.hubConnection.on('DocumentCommentAdded', (documentId: string, comment: DocumentComment) => {
      this.lastEventTimestamp.set(new Date());
      this.commentAdded$.next({ documentId, comment });
    });

    this.hubConnection.on('ActiveUsersUpdated', (count: number) => {
      this.activeUsers.set(count);
    });

    this.hubConnection.on('NotificationReceived', (title: string, message: string, type: string) => {
      this.notification$.next({ title, message, type });
    });
  }

  public joinDocumentRoom(documentId: string): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinDocumentRoom', documentId);
    }
  }

  public leaveDocumentRoom(documentId: string): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('LeaveDocumentRoom', documentId);
    }
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}

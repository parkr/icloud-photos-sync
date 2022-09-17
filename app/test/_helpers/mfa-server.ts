import { MFAServer } from "../../src/lib/icloud/mfa/mfa-server";
import {jest} from '@jest/globals';

import { IncomingMessage, ServerResponse } from "http";
import { EventEmitter } from "stream";

export function mfaServerFactory(): MFAServer {
    const server = new MFAServer();
    return server
}

export function spyOnEvent(object: EventEmitter, eventName: string): any {
    const eventFunction = jest.fn();
    object.on(eventName, eventFunction);
    return eventFunction 
}

export function requestFactory(url: string, method: string = 'POST'): IncomingMessage {
    return {
        "url": url,
        "method": method
    } as unknown as IncomingMessage;
}

export function responseFactory(): ServerResponse<IncomingMessage> { 
    return {
        writeHead: jest.fn(),
        end: jest.fn()
    } as unknown as ServerResponse<IncomingMessage>;
}
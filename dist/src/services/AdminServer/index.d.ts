/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { Server } from 'https';
import { Socket } from 'net';
import { IAppConfiguration } from '../../../config/index';
import { MCServer } from '../MCServer/index';
/**
 * SSL web server for managing the state of the system
 * @module AdminServer
 */
/**
 *
 * @property {config} config
 * @property {MCServer} mcServer
 * @property {Server} httpServer
 */
export declare class AdminServer {
    static _instance: AdminServer;
    config: IAppConfiguration;
    mcServer: MCServer;
    serviceName: string;
    httpsServer: Server | undefined;
    static getInstance(mcServer: MCServer): AdminServer;
    private constructor();
    /**
     *
     * @return {string}
     */
    _handleGetConnections(): string;
    /**
     *
     * @return {string}
     */
    _handleResetAllQueueState(): string;
    /**
     * @return {void}
     * @param {import("http").IncomingMessage} request
     * @param {import("http").ServerResponse} response
     */
    _httpsHandler(request: IncomingMessage, response: ServerResponse): void;
    /**
     * @returns {void}
     * @param {import("net").Socket} socket
     */
    _socketEventHandler(socket: Socket): void;
    /**
     *
     * @param {module:config.config} config
     * @return {Promise<void>}
     */
    start(): Server;
}

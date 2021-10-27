// @ts-check
// mcos is a game server, written from scratch, for an old game
// Copyright (C) <2017-2018>  <Joseph W Becher>
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { pino } from "pino";
import { readFileSync } from "fs";
import { EServerConnectionName } from "mcos-router";
import { ShardEntry } from "./shard-entry";
import { RoutingMesh } from "mcos-router";
import { createServer, Server } from "https";
import { AppConfiguration, ConfigurationManager } from "mcos-config";
import { IncomingMessage, ServerResponse } from "http";

// This section of the server can not be encrypted. This is an intentional choice for compatibility
// deepcode ignore HttpToHttps: This is intentional. See above note.
const log = pino();

/**
 * Manages patch and update server connections
 * Also handles the shard list, and some utility endpoints
 * TODO: Document the endpoints
 */

/**
 * @class
 * @property {config.config} config
 * @property {string[]} banList
 * @property {string[]} possibleShards
 * @property {Server} serverPatch
 */
export class ShardServer {
  static _instance: ShardServer;
  _config: AppConfiguration;
  _possibleShards: string[] = [];
  _server: Server;
  _serviceName = "MCOServer:Shard";

  static getInstance(): ShardServer {
    if (!ShardServer._instance) {
      ShardServer._instance = new ShardServer();
    }
    return ShardServer._instance;
  }

  private constructor() {
    this._config = ConfigurationManager.getInstance().getConfig();

    this._server = createServer((request, response) => {
      this._handleRequest(request, response);
    });

    this._server.on("error", (error) => {
      process.exitCode = -1;
      log.error("error", `Server error: ${error.message}`, {
        service: this._serviceName,
      });
      log.info("info", `Server shutdown: ${process.exitCode}`, {
        service: this._serviceName,
      });
      process.exit();
    });
  }

  /**
   * Generate a shard list web document
   *
   * @return {string}
   * @memberof! PatchServer
   */
  _generateShardList(): string {
    // const { host } = this._config.serverSettings
    const host = "10.0.0.20";
    const shardClockTower = new ShardEntry(
      "The Clocktower",
      "The Clocktower",
      44,
      host,
      8226,
      host,
      7003,
      host,
      0,
      "",
      "Group-1",
      88,
      2,
      host,
      80
    );

    this._possibleShards.push(shardClockTower.formatForShardList());

    const shardTwinPinesMall = new ShardEntry(
      "Twin Pines Mall",
      "Twin Pines Mall",
      88,
      host,
      8226,
      host,
      7003,
      host,
      0,
      "",
      "Group-1",
      88,
      2,
      host,
      80
    );

    this._possibleShards.push(shardTwinPinesMall.formatForShardList());

    /** @type {string[]} */
    const activeShardList: string[] = [];
    activeShardList.push(shardClockTower.formatForShardList());

    return activeShardList.join("\n");
  }

  /**
   *
   * @return {string}
   * @memberof! WebServer
   */
  _handleGetCert(): string {
    return readFileSync(this._config.certificate.certFilename).toString();
  }

  /**
   *
   * @return {string}
   * @memberof! WebServer
   */
  _handleGetKey(): string {
    return readFileSync(this._config.certificate.publicKeyFilename).toString();
  }

  /**
   *
   * @return {string}
   * @memberof! WebServer
   */
  _handleGetRegistry(): string {
    const { ipServer: ipServer } = this._config.serverSettings;
    return `Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EACom\\AuthAuth]
"AuthLoginBaseService"="AuthLogin"
"AuthLoginServer"="${ipServer}"

[HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\Motor City]
"GamePatch"="games/EA_Seattle/MotorCity/MCO"
"UpdateInfoPatch"="games/EA_Seattle/MotorCity/UpdateInfo"
"NPSPatch"="games/EA_Seattle/MotorCity/NPS"
"PatchServerIP"="${ipServer}"
"PatchServerPort"="80"
"CreateAccount"="${ipServer}/SubscribeEntry.jsp?prodID=REG-MCO"
"Language"="English"

[HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\Motor City\\1.0]
"ShardUrl"="http://${ipServer}/ShardList/"
"ShardUrlDev"="http://${ipServer}/ShardList/"

[HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\Motor City\\AuthAuth]
"AuthLoginBaseService"="AuthLogin"
"AuthLoginServer"="${ipServer}"

[HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\Electronic Arts\\Network Play System]
"Log"="1"

`;
  }

  /**
   * @return {void}
   * @memberof ! PatchServer
   * @param {import("http").IncomingMessage} request
   * @param {import("http").ServerResponse} response
   */
  _handleRequest(request: IncomingMessage, response: ServerResponse): void {
    if (request.url === "/cert") {
      response.setHeader(
        "Content-disposition",
        "attachment; filename=cert.pem"
      );
      return response.end(this._handleGetCert());
    }

    if (request.url === "/key") {
      response.setHeader("Content-disposition", "attachment; filename=pub.key");
      return response.end(this._handleGetKey());
    }

    if (request.url === "/registry") {
      response.setHeader("Content-disposition", "attachment; filename=mco.reg");
      return response.end(this._handleGetRegistry());
    }

    if (request.url === "/") {
      response.statusCode = 404;
      return response.end("Hello, world!");
    }

    if (request.url === "/ShardList/") {
      log.debug(
        "debug",
        `Request from ${request.socket.remoteAddress} for ${request.method} ${request.url}.`,
        { service: this._serviceName }
      );

      response.setHeader("Content-Type", "text/plain");
      return response.end(this._generateShardList());
    }

    // Is this a hacker?
    response.statusCode = 404;
    response.end("");

    // Unknown request, log it
    log.info(
      "info",
      `Unknown Request from ${request.socket.remoteAddress} for ${request.method} ${request.url}`,
      { service: this._serviceName }
    );
  }

  start(): Server {
    const host = this._config.serverSettings.ipServer || "localhost";
    const port = 82;
    return this._server.listen({ port, host }, () => {
      log.debug("debug", `port ${port} listening`, {
        service: this._serviceName,
      });
      log.info("info", "Patch server is listening...", {
        service: this._serviceName,
      });

      // Register service with router
      RoutingMesh.getInstance().registerServiceWithRouter(
        EServerConnectionName.SHARD,
        host,
        port
      );
    });
  }
}

/**
 * @typedef {Object} config
 * @property {Object} [certificate] - optional if the server is not using ssl
 * @property {string} certificate.privateKeyFilename
 * @property {string} certificate.publicKeyFilename
 * @property {string} certificate.certFilename
 * @property {Object} serverSettings
 * @property {string} serverSettings.ipServer
 * @property {Object} serviceConnections
 * @property {string} serviceConnections.databaseURL
 */
declare const _default: {
    certificate: {};
    serverSettings: {
        host: string;
    };
    serviceConnections: {
        databaseURL: string;
    };
};
export default _default;

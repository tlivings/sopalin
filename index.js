'use strict';

const Pkg = require('./package.json');
const Domain = require('domain');
const Hoek = require('hoek');

const internals = {
    info: {
        name: Pkg.name,
        version: Pkg.version
    },

    defaults: {
        shutdownTimeout: 10000,
        shutdownHeaders: {},
        responseHeaders: {}
    }
};

exports.register = function (server, { lastly, shutdownTimeout = internals.defaults.shutdownTimeout, shutdownHeaders = internals.defaults.shutdownHeaders, responseHeaders = internals.defaults.responseHeaders }, next) {
    let shuttingDown = false;

    const close = Hoek.once((error) => {
        server.log(['warn'], 'shutting down.');
        server.root.stop({ timeout: shutdownTimeout }, () => {
            if (lastly) {
                lastly(error);
                return;
            }
            server.log(['warn'], 'process exit.');
            process.exit(1);
        });
    });

    server.ext('onRequest', (request, reply) => {
        if (shuttingDown) {
            server.log(['warn'], '503 response while shutting down.');
            request.raw.res.writeHead(503, responseHeaders);
            request.raw.res.end();
            return;
        }

        const d = Domain.create();

        d.add(request.raw.req);
        d.add(request.raw.res);

        d.once('error', (error) => {
            shuttingDown = true;

            server.log(['error', 'uncaughtException'], error.stack);

            request.raw.res.writeHead(500, shutdownHeaders);
            request.raw.res.end();

            close(error);
        });

        d.run(() => {
            reply.continue();
        });
    });

    next();
};

exports.register.attributes = internals.info;

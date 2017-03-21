'use strict';

const Pkg = require('./package.json');
const Domain = require('domain');
const Hoek = require('hoek');
const Joi = require('joi');

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

const schema = Joi.object({
    lastly: Joi.func().allow(null),
    shutdownTimeout: Joi.number().default(internals.defaults.shutdownTimeout),
    shutdownHeaders: Joi.object().default(internals.defaults.shutdownHeaders),
    responseHeaders: Joi.object().default(internals.defaults.responseHeaders)
});

const plugin = {
    register(server, options, next) {
        let shuttingDown = false;

        const validation = Joi.validate(options, schema);

        Hoek.assert(!validation.error, validation.error);

        const { lastly, shutdownTimeout, shutdownHeaders, responseHeaders } = validation.value;

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
            const { req, res } = request.raw;

            if (shuttingDown) {
                request.log(['warn'], '503 response while shutting down.');
                res.writeHead(503, responseHeaders);
                res.end();
                return;
            }

            const d = Domain.create();

            d.add(req);
            d.add(res);

            d.once('error', (error) => {
                shuttingDown = true;

                request.log(['error', 'uncaughtException'], error.stack);

                res.writeHead(500, shutdownHeaders);
                res.end();

                close(error);
            });

            d.run(() => {
                reply.continue();
            });
        });

        next();
    }
};

plugin.register.attributes = internals.info;

module.exports = plugin;

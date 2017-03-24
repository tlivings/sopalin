'use strict';

const Pkg = require('./package.json');
const Hoek = require('hoek');
const Joi = require('joi');
const Boom = require('boom');

const internals = {
    info: {
        name: Pkg.name,
        version: Pkg.version
    },

    defaults: {
        shutdownTimeout: 10000,
        replyHeaders: {}
    }
};

const schema = Joi.object({
    lastly: Joi.func().allow(null),
    shutdownTimeout: Joi.number().default(internals.defaults.shutdownTimeout),
    replyHeaders: Joi.object().default(internals.defaults.replyHeaders)
});

const plugin = {
    register(server, options, next) {
        let shuttingDown = false;

        const validation = Joi.validate(options, schema);

        Hoek.assert(!validation.error, validation.error);

        const { lastly, shutdownTimeout, replyHeaders } = validation.value;

        const errorHandler = function (request, error) {
            if (error.domainThrown) {
                shuttingDown = true;

                server.log(['warn'], 'shutting down.');

                server.root.stop({ timeout: shutdownTimeout }, () => {
                    server.removeListener('request-error', errorHandler);

                    if (lastly) {
                        lastly(error);
                        return;
                    }

                    server.log(['warn'], 'process exit.');
                    process.exit(1);
                });
            }
        };

        server.on('request-error', errorHandler);

        server.ext('onRequest', (request, reply) => {
            if (shuttingDown) {
                request.log(['warn'], '503 response while shutting down.');

                const errorResponse = Boom.serverUnavailable();

                errorResponse.output.headers = replyHeaders;

                reply(errorResponse);
                return;
            }

            reply.continue();
        });

        next();
    }
};

plugin.register.attributes = internals.info;

module.exports = plugin;

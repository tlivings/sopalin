'use strict';

const Test = require('tape');
const Sopalin = require('../index');
const Hapi = require('hapi');
const Boom = require('boom');

Test('test sopalin', (t) => {

    t.test('with lastly', (t) => {
        t.plan(7);

        const server = new Hapi.Server();

        server.connection({ port: 3000 });

        const plugins = [
            {
                register: Sopalin.register,
                options: {
                    replyHeaders: {
                        'a': 'a-header'
                    },
                    lastly: (error) => {
                        t.ok(error, 'error.');
                        t.pass('lastly called.');
                        t.equal(error.message, 'Uncaught error: Something blew up!', 'error passed to lastly.');
                    }
                }
            },
            {
                register: require('good'),
                options: {
                    reporters: {
                        consoleReporter: [
                            {
                                module: 'good-console',
                            },
                            'stdout'
                        ]
                    }
                }
            }
        ];

        server.register(plugins, (error) => {
            t.error(error, 'should not be an error.');

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {
                    setImmediate(() => {
                        throw new Error('Something blew up!');
                    });
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, (response) => {
                t.equal(response.statusCode, 500, 'error response.');
                setImmediate(() => {
                    server.inject({
                        method: 'GET',
                        url: '/'
                    }, (response) => {
                        t.equal(response.statusCode, 503, '503 response.');
                        t.equal(response.headers.a, 'a-header', 'replyHeaders passed.');
                    });
                });
            });
        });

    });

    t.test('without lastly', (t) => {
        t.plan(3);

        const server = new Hapi.Server();

        server.connection({ port: 3000 });

        const plugins = [
            {
                register: Sopalin.register
            }
        ];

        const exit = process.exit;

        process.exit = function (n) {
            t.equal(n, 1, 'process.exit(1) called.');
        };

        t.once('end', () => {
            process.exit = exit;
        });

        server.register(plugins, (error) => {
            t.error(error, 'should not be an error.');

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {
                    setImmediate(() => {
                        throw new Error('Something blew up!');
                    });
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, (response) => {
                t.equal(response.statusCode, 500, 'error response.');
            });
        });

    });

    t.test('non domain-error', (t) => {
        t.plan(3);

        const server = new Hapi.Server();

        server.connection({ port: 3000 });

        const plugins = [
            {
                register: Sopalin.register
            }
        ];

        const exit = process.exit;
        let exitCalled = false;

        process.exit = function (n) {
            exitCalled = true;
        };

        t.once('end', () => {
            process.exit = exit;
        });

        server.register(plugins, (error) => {
            t.error(error, 'should not be an error.');

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {
                    reply(Boom.badImplementation());
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, (response) => {
                t.equal(response.statusCode, 500, 'error response.');
                setTimeout(() => t.ok(!exitCalled, 'process.exit not called.'), 100);
            });
        });

    });

});

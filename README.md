# sopalin

Wipe up spilled milk in Hapi.

Plugin is a registrable replacement to Hapi.js' domain/protect logic which will gracefully shutdown Node as a result of a uncaught exception.

Plugin will return a `500` status code for the request which spawned the unhandled exception and `503` to any incoming requests until completely shut down.

## Registration options

- `shutdownHeaders` - Response headers to return when an error occurs. Defaults to `{}`.
- `responseHeaders` - Reponse headers to return during a post-error shutdown. Defaults to `{}`.
- `shutdownTimeout` - Timeout option for Hapi.Server#stop. Defaults to `10000`.
- `lastly` - ???.

## Usage
1. Set the Hapi.Server.useDomains option to `false`.
2. Register the plugin.

```js
const Hapi = require('hapi');
const server = new Hapi.Server({
    useDomains: false
});
server.register({
    register: require('sopalin'),
    options: {
        shutdownTimeout: 15000
    }
}, (error) => {
    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            setImmediate(() => {
                throw new Error('Something blew up!');
            });
        }
    });
});
```

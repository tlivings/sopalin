# sopalin

Wipe up spilled milk in Hapi.

A plugin to shutdown on uncaughtExceptions, while allowing in-flight responses to complete. While the server is shutting down,
new requests will be responded to with a `503`.

## Registration options

- `replyHeaders` - Response headers to return post error, while the server is still shutting down. Defaults to `{}`.
- `shutdownTimeout` - Timeout option for Hapi.Server#stop. Defaults to `10000`.
- `lastly` - A final callback for clean up. Accepted signature: `function(error)`. Called after server shutdown.

## Usage

```javascript
const Hapi = require('hapi');
const Sopalin = require('sopalin');

const server = new Hapi.Server();

server.register({
    register: Sopalin,
    options: {
        shutdownTimeout: 15000,
        replyHeaders: {
            'x-custom-retry-header': 'true'
        }
    }
}, (error) => {
    //Everything else...
});
```

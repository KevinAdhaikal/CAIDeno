# CAIDeno
Unofficial Character.AI API using Deno
# Example
```js
import CAIDeno from "./mod.ts";
import config from "./config.json" with { type: "json" };

const cai_client = new CAIDeno();

(async function() {
    cai_client.on("message", function(data) {
        console.log(data)
    })
    await cai_client.login(config.token)
    cai_client.logout()
})()
```

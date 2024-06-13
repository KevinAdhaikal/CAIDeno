# CAIDeno
Unofficial Character.AI API using Deno
# Example
```js
import { CAIDeno } from "https://deno.land/x/caideno/mod.ts"
const CAI = new CAIDeno();

(async function() {
    await CAI.login("Character.AI Token");
    console.log("Connected!")
    CAI.logout()
})()
```

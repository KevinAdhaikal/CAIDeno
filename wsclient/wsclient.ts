import EventEmitter from "https://deno.land/x/events@v1.0.0/mod.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function check_two_char(target: string, char1: string, char2: string) {
    const res = [0, 0]
    for (let a = 0; a < target.length; a++) {
        if (target[a] == char1[0]) res[0] = 1
        else if (target[a] == char2[0]) {
            res[1] = 1
        }
    }
    return res[0] && res[1]
}

function generate_hex(n: number): Array<number> {
    const result: Array<number> = [];
    for (let a = 0; a < n; a++) result.push(Math.floor(Math.random() * 256))
    return result;
}

async function readResponse(conn: Deno.Conn): Promise<string> {
    let response = '';
    const buffer = new Uint8Array(128);

    while (true) {
        const bytesRead = await conn.read(buffer);
        if (bytesRead == null) break;
        response += decoder.decode(buffer.subarray(0, bytesRead));
        if (response.includes("\r\n\r\n")) break;
    }

  return response;
}

function decimalToBinary(decimal: number): string {
    let binary = decimal.toString(2);
    while (binary.length < 8) {
        binary = '0' + binary;
    }
    return binary;
}

function generateSecWebSocketKey(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export class WSClient extends EventEmitter {
    private conn: Deno.Conn = <Deno.Conn>{};
    private is_connected: number = 0;

    constructor() {
        super();
    }

    private async listen_websocket() {
        while(1) {
            if (this.is_connected == 1) {
                this.is_connected = 2;
                this.emit("open", "")
            }
            let frame = new Uint8Array(2);
            const n = await this.conn.read(frame).catch(() => {});
            if (!n) {
                this.emit("close", "")
                break;
            }

            if (frame[1] == 126) {
                frame = new Uint8Array(2);
                await this.conn.read(frame);
                frame = new Uint8Array((frame[0] << (8)) + frame[1]);
                await this.conn.read(frame);
            } else {
                frame = new Uint8Array(parseInt("0" + decimalToBinary(frame[1]).slice(1), 2))
                await this.conn.read(frame);
            }

            this.emit("message", decoder.decode(frame))
        }
    }
    public async connect(url: string, cookie: object = {}): Promise<string> {
        let hostname;
        let port;
        let path;
        let is_tls = 0;

        //check url parameter
        if (url.includes("wss://") || url.includes("https://")) {
            is_tls = 1;
            url = url.slice(url.startsWith("wss://") ? 6 : 8)
            if (check_two_char(url, ':', '/')) {
                const port_obj = url.split(":")
                hostname = port_obj[0]
                const indexof_res = port_obj[1].indexOf("/")
                if (indexof_res != -1 && port_obj[1][indexof_res]) {
                    port = Number(port_obj[1].split("/")[0])
                    path = port_obj[1].slice(indexof_res)
                } else {
                    port = Number(port_obj[1])
                    path = '/'
                }
            } else if (url.indexOf(":") != -1) {
                const port_obj = url.split(":")
                hostname = port_obj[0]
                port = Number(Number(port_obj[1]))
                path = '/'
            } else if (url.indexOf("/") != -1) {
                hostname = url.split("/")[0]
                port = 443
                path = url.slice(url.indexOf("/"))
            } else {
                hostname = url
                port = 443
                path = '/'
            }
        } else if (url.includes("ws://") || url.includes("http://")) {
            url = url.slice(url.startsWith("ws://") ? 5 : 7)
            if (check_two_char(url, ':', '/')) {
                const port_obj = url.split(":")
                hostname = port_obj[0]
                const indexof_res = port_obj[1].indexOf("/")
                if (indexof_res != -1 && port_obj[1][indexof_res]) {
                    port = Number(port_obj[1].split("/")[0])
                    path = port_obj[1].slice(indexof_res)
                } else {
                    port = Number(port_obj[1])
                    path = '/'
                }
            } else if (url.indexOf(":") != -1) {
                const port_obj = url.split(":")
                hostname = port_obj[0]
                port = Number(Number(port_obj[1]))
                path = '/'
            } else if (url.indexOf("/") != -1) {
                hostname = url.split("/")[0]
                port = 80
                path = url.slice(url.indexOf("/"))
            }
        }
        
        const cookie_res = Object.entries(cookie).map(([key, value]) => `${key}=${value}`).join('; ');
        this.conn = is_tls ? await Deno.connectTls({hostname, port: Number(port)}) : await Deno.connect({hostname, port: Number(port)});

        await this.conn.write(encoder.encode(`GET ${path} HTTP/1.1\r
Sec-WebSocket-Version: 13\r
Sec-WebSocket-Key: ${generateSecWebSocketKey()}\r
Connection: Upgrade\r
Upgrade: websocket\r${cookie_res ? "\nCookie: " + cookie_res : ""}
Host: ${hostname}${!(port == 80 || port == 443) ? ':' + port : ''}\r\n\r\n`));

        const response = await readResponse(this.conn)
        if (!response.includes("101 Switching Protocols")) throw new Error("WebSocket Handshake fail.");
        
        this.is_connected = 1;
        this.listen_websocket();
        return response;
    }

    public async send(data: string): Promise<void> {
        if (this.is_connected != 2) return;
        const frame = new Uint8Array(data.length + (data.length > 125 ? 8 : 6));
        const masking_key = generate_hex(4);
        let current_pos = (data.length > 125 ? 8 : 6);
        if (data.length > 125) frame.set([
                0x81, // FIN + opcode
                0xfe, // Mask + Extended payload length
    
                // 16 bit extended payload length
                (data.length >> 8) & 255,
                data.length & 255,
    
                ...masking_key // Masking key
            ], 0)
        else frame.set([
                0x81, // FIN + opcode
                0x80 + data.length, // Mask + Extended payload length
    
                ...masking_key // Masking key
            ], 0)
        
        for (let a = 0; a < data.length; a++) frame[current_pos++] = data.charCodeAt(a) ^ masking_key[a % 4];
        await this.conn.write(frame)
    }
    public close() {
        this.is_connected = 0;
        this.conn.close()
        this.removeAllListeners("open")
        this.removeAllListeners("message")
        this.removeAllListeners("close")
    }
}
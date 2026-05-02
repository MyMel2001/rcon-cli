#!/usr/bin/env node

const net = require('net');
const readline = require('readline');

class RCONClient {
  constructor(host, port, password) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.socket = null;
    this.requestId = 0;
    this.authenticated = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setTimeout(5000);

      this.socket.on('error', reject);
      this.socket.on('timeout', () => {
        this.socket.destroy();
        reject(new Error('Connection timeout'));
      });

      this.socket.connect(this.port, this.host, () => {
        this.authenticate()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  authenticate() {
    return new Promise((resolve, reject) => {
      const packet = this.buildPacket(3, this.password);
      this.sendPacket(packet);

      let responseBuffer = Buffer.alloc(0);

      const onData = (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);

        if (responseBuffer.length >= 12) {
          const response = this.parsePacket(responseBuffer);
          if (response.id === -1) {
            this.socket.destroy();
            reject(new Error('Authentication failed: invalid password'));
            return;
          }
          this.authenticated = true;
          this.socket.off('data', onData);
          resolve();
        }
      };

      this.socket.on('data', onData);
    });
  }

  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.authenticated) {
        reject(new Error('Not authenticated'));
        return;
      }

      const packet = this.buildPacket(2, command);
      this.sendPacket(packet);

      let responseBuffer = Buffer.alloc(0);

      const onData = (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);

        if (responseBuffer.length >= 12) {
          const response = this.parsePacket(responseBuffer);
          this.socket.off('data', onData);
          resolve(response.body.toString('utf8').trim());
        }
      };

      this.socket.on('data', onData);
    });
  }

  buildPacket(type, body) {
    const bodyBuffer = Buffer.from(body, 'utf8');
    const size = 10 + bodyBuffer.length;
    const packet = Buffer.alloc(4 + size);

    let offset = 0;
    packet.writeInt32LE(size, offset); offset += 4;
    packet.writeInt32LE(this.getRequestId(), offset); offset += 4;
    packet.writeInt32LE(type, offset); offset += 4;
    bodyBuffer.copy(packet, offset); offset += bodyBuffer.length;
    packet.writeInt8(0, offset); offset += 1;
    packet.writeInt8(0, offset);

    return packet;
  }

  parsePacket(buffer) {
    const size = buffer.readInt32LE(0);
    const id = buffer.readInt32LE(4);
    const type = buffer.readInt32LE(8);
    const body = buffer.slice(12, 12 + size - 10);

    return { size, id, type, body };
  }

  sendPacket(packet) {
    this.socket.write(packet);
  }

  getRequestId() {
    this.requestId = (this.requestId + 1) % 2147483647;
    return this.requestId;
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
RCON CLI Client

Usage:
  rcon-cli <host> <port> <password> [command]
  rcon-cli <host> <port> <password> --interactive

Arguments:
  host        RCON server hostname or IP
  port        RCON server port
  password    RCON password
  command     Command to execute (optional)

Options:
  -h, --help     Show this help message
  -i, --interactive  Run in interactive mode

Examples:
  rcon-cli 127.0.0.1 25575 mypassword "list"
  rcon-cli 127.0.0.1 25575 mypassword --interactive
    `);
    process.exit(0);
  }

  const host = args[0];
  const port = parseInt(args[1], 10);
  const password = args[2];
  const command = args[3];
  const isInteractive = args.includes('--interactive') || args.includes('-i');

  if (!host || !port || !password) {
    console.error('Error: host, port, and password are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  const client = new RCONClient(host, port, password);

  try {
    console.log(`Connecting to ${host}:${port}...`);
    await client.connect();
    console.log('Connected and authenticated!\n');

    if (isInteractive) {
      await interactiveMode(client);
    } else if (command) {
      const response = await client.sendCommand(command);
      console.log(response);
    } else {
      console.error('Error: no command specified. Use --interactive for interactive mode.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    client.disconnect();
  }
}

async function interactiveMode(client) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'rcon> '
  });

  console.log('Interactive mode. Type "exit" or "quit" to disconnect.\n');
  rl.prompt();

  for await (const line of rl) {
    const command = line.trim();

    if (command === 'exit' || command === 'quit') {
      rl.close();
      break;
    }

    if (command === '') {
      continue;
    }

    try {
      const response = await client.sendCommand(command);
      console.log(response);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }
}

main();

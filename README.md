# RCON CLI

A CLI-based RCON (Remote Console) client for game servers using the RCON protocol. Compatible with Minecraft, Source engine games, and other RCON-enabled servers.

## Installation

```bash
npm install -g .
```

Or run directly with Node:

```bash
node index.js <host> <port> <password> [command]
```

## Usage

### Single Command

```bash
rcon-cli 127.0.0.1 25575 mypassword "list"
rcon-cli 127.0.0.1 25575 mypassword "say Hello from RCON"
```

### Interactive Mode

```bash
rcon-cli 127.0.0.1 25575 mypassword --interactive
```

In interactive mode, you can type commands repeatedly. Type `exit` or `quit` to disconnect.

### Help

```bash
rcon-cli --help
```

## Protocol

This client implements the standard RCON protocol:
- TCP connection to the specified host and port
- Authentication with password
- Command execution with response handling

## Examples

### Minecraft Server

```bash
# List players
rcon-cli localhost 25575 mypassword "list"

# Send a message
rcon-cli localhost 25575 mypassword "say Server restart in 5 minutes"

# Interactive mode
rcon-cli localhost 25575 mypassword -i
```

### Source Engine Games (CS:GO, TF2, etc.)

```bash
# Get server status
rcon-cli localhost 27015 mypassword "status"

# Change map
rcon-cli localhost 27015 mypassword "changelevel de_dust2"
```

## Requirements

- Node.js >= 14.0.0

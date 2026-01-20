# MCP Integration

Incito supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing AI assistants like Claude Desktop, Cursor, and Claude Code to access your prompt library.

## Setup

### Claude Desktop

1. Open Incito and configure your prompts folder in Settings
2. Open Claude Desktop's configuration file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

3. Add the Incito MCP server configuration:

```json
{
  "mcpServers": {
    "incito": {
      "command": "/Applications/Incito.app/Contents/MacOS/incito-mcp"
    }
  }
}
```

Adjust the path based on your platform:
- **macOS:** `/Applications/Incito.app/Contents/MacOS/incito-mcp`
- **Windows:** `C:\Program Files\Incito\incito-mcp.exe`
- **Linux:** `/usr/local/bin/incito-mcp`

4. Restart Claude Desktop

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "incito": {
      "command": "/Applications/Incito.app/Contents/MacOS/incito-mcp"
    }
  }
}
```

### Claude Code

Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "incito": {
      "command": "/Applications/Incito.app/Contents/MacOS/incito-mcp"
    }
  }
}
```

## Available Tools

### `list_prompts`

List all available prompt templates from your Incito library.

**Input:**
- `tag` (optional): Filter prompts by tag
- `search` (optional): Search prompts by name or description

**Example:**
```
List my prompts
```

```
Show prompts tagged with "writing"
```

### `get_prompt`

Get the full details of a prompt template including its template text and variable definitions.

**Input:**
- `id` (optional): The unique ID of the prompt
- `name` (optional): The name of the prompt (case-insensitive, partial match supported)

**Example:**
```
Get the "Code Review" prompt
```

### `use_prompt`

Fill a prompt template with variable values and return the interpolated result.

**Input:**
- `id` (optional): The unique ID of the prompt
- `name` (optional): The name of the prompt
- `variables`: Object with variable key-value pairs

**Example:**
```
Use my "Blog Post" prompt with topic="AI in Healthcare" and tone="professional"
```

## Usage Examples

Once configured, you can interact with your prompts naturally:

1. **List prompts:**
   > "Show me all my prompts"
   > "List prompts tagged with 'code'"

2. **Get prompt details:**
   > "What variables does the 'Email Response' prompt need?"
   > "Show me the 'Meeting Notes' template"

3. **Use a prompt:**
   > "Use my 'Code Review' prompt to review this function: [paste code]"
   > "Fill in the 'Bug Report' prompt with summary='Login fails on Safari' and priority='high'"

## Troubleshooting

### "Incito prompts folder not configured"

Open Incito and select a prompts folder in Settings. The MCP server reads the folder path from Incito's database.

### "Prompt not found"

Ensure the prompt name matches (partial matches are supported). Try listing all prompts first to see available options.

### MCP server not connecting

1. Verify the binary path is correct for your platform
2. Check that Incito has been run at least once to create the database
3. Restart your AI client after configuration changes

### Testing the MCP server

You can test the MCP server directly:

```bash
# macOS
/Applications/Incito.app/Contents/MacOS/incito-mcp

# The server will wait for stdio input
```

Or use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector /Applications/Incito.app/Contents/MacOS/incito-mcp
```

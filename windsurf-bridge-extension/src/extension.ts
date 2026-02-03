import * as vscode from "vscode";
import {
  CostBadgeDisplay,
  registerCostBadgeCommands,
} from "./costBadgeDisplay";
import { McpServer } from "./mcpServer";

let mcpServer: McpServer | undefined;
let costBadgeDisplay: CostBadgeDisplay | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Windsurf Bridge extension is now active");

  // Initialize cost badge display
  costBadgeDisplay = new CostBadgeDisplay(context);
  registerCostBadgeCommands(context, costBadgeDisplay);

  // Auto-activate cost display
  const config = vscode.workspace.getConfiguration("windsurf-bridge");
  if (config.get<boolean>("showCostBadges", true)) {
    costBadgeDisplay.activate();
  }

  const startCommand = vscode.commands.registerCommand(
    "windsurf-bridge.startMcpServer",
    async () => {
      if (mcpServer) {
        vscode.window.showWarningMessage("MCP Server is already running");
        return;
      }

      const port = config.get<number>("mcpPort", 3100);

      mcpServer = new McpServer(context, port);
      await mcpServer.start();
      vscode.window.showInformationMessage(
        `MCP Server started on port ${port}`,
      );
    },
  );

  const stopCommand = vscode.commands.registerCommand(
    "windsurf-bridge.stopMcpServer",
    async () => {
      if (!mcpServer) {
        vscode.window.showWarningMessage("MCP Server is not running");
        return;
      }

      await mcpServer.stop();
      mcpServer = undefined;
      vscode.window.showInformationMessage("MCP Server stopped");
    },
  );

  context.subscriptions.push(startCommand, stopCommand);

  if (config.get<boolean>("autoStart", true)) {
    vscode.commands.executeCommand("windsurf-bridge.startMcpServer");
  }
}

export function deactivate() {
  if (mcpServer) {
    mcpServer.stop();
  }
  if (costBadgeDisplay) {
    costBadgeDisplay.deactivate();
  }
}

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function parseCodeowners(codeownersPath: string = ""): { scopeMap: Record<string, string[]>; teams: string[] } {
	if (codeownersPath == "") {
		const repoPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
		codeownersPath = path.join(repoPath, '.github', 'CODEOWNERS');
	}

	const scopeMap: Record<string, string[]> = {};
	const teams = new Set<string>();

	if (!fs.existsSync(codeownersPath)) return { scopeMap, teams: [] };

	const content = fs.readFileSync(codeownersPath, 'utf-8');
	const lines = content.split('\n');

	lines.forEach(line => {
		const cleanLine = line.split('#')[0].trim(); // Ignore inline comments
		if (!cleanLine || cleanLine.startsWith('#')) return; // Skip comment lines

		const match = cleanLine.match(/^(\S+)(?:\s+((?:@\S+|[\w.-]+@[\w.-]+)(?:\s+(?:@\S+|[\w.-]+@[\w.-]+))*)?)?$/);
		if (match) {
			const filePath = match[1].trim();
			const owners = match[2] ? match[2].trim().split(/\s+/) : [];
			scopeMap[filePath] = owners;
			owners.forEach(team => teams.add(team));
		}
	});

	return { scopeMap, teams: Array.from(teams) };
}

export async function selectTeams(teams: string[]): Promise<string[]> {
	const selectedTeams = await vscode.window.showQuickPick(teams, {
		canPickMany: true,
		placeHolder: "Select GitHub teams for file filter"
	});

	if (!selectedTeams) {
		vscode.window.showWarningMessage("No teams selected. Using default visibility.");
		return [];
	}

	return selectedTeams;
}

export async function selectAndSaveTeams(context: vscode.ExtensionContext, teams: string[]) {
	const selectedTeams = await selectTeams(teams);

	if (selectedTeams.length > 0) {
		context.workspaceState.update("selectedTeams", selectedTeams);
		vscode.window.showInformationMessage(`Teams selected: ${selectedTeams.join(", ")}`);
	}
}

export async function updateExplorerVisibility(context: vscode.ExtensionContext, scopeMap: Record<string, string[]>) {
	const selectedTeams = context.workspaceState.get<string[]>("selectedTeams") || [];
	const allFiles = await vscode.workspace.findFiles('**/*');
	const excludes = buildFileExclusionFilter(selectedTeams, scopeMap, allFiles)

	await setFileExclusionFilter(excludes);
}

export function buildFileExclusionFilter(selectedTeams: string[], scopeMap: Record<string, string[]>, allFiles: vscode.Uri[]): Record<string, boolean> {
	const excludes: Record<string, boolean> = {};
	const includes: Record<string, boolean> = {};

	if (!selectedTeams.length) return excludes;

	const allowedPaths = Object.keys(scopeMap).filter(path =>
		scopeMap[path].some(owner => selectedTeams.includes(owner))
	);

	// Exclude all files that are NOT in allowedPaths
	allFiles.forEach(file => {
		const relativePath = vscode.workspace.asRelativePath(file);
		if (!allowedPaths.some(allowedPath => relativePath.startsWith(allowedPath))) {
			excludes[relativePath] = true;
		} else {
			includes[relativePath] = false;
		}
	});

	return excludes;
}

export async function setFileExclusionFilter(paths: Record<string, boolean>) {
	const config = vscode.workspace.getConfiguration();

	await config.update('files.exclude', paths, vscode.ConfigurationTarget.Workspace, true);
}

export async function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage('GitHub codeowner scope filter activated');

	let disposable = vscode.commands.registerCommand('extension.selectTeams', async () => {
		const { scopeMap, teams } = parseCodeowners();
		await selectAndSaveTeams(context, teams);
		await updateExplorerVisibility(context, scopeMap);
	});
	context.subscriptions.push(disposable);

	const { scopeMap, teams } = parseCodeowners();

	await selectAndSaveTeams(context, teams);
	await updateExplorerVisibility(context, scopeMap);
}

export function deactivate() { }

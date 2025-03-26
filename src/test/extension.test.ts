import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseCodeowners, buildFileExclusionFilter } from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Should return an empty scopeMap and teams array if CODEOWNERS file does not exist', () => {
		const result = parseCodeowners('nothing/here.txt');
		assert.deepStrictEqual(result, { scopeMap: {}, teams: [] });
	});

	test('Should correctly parse a CODEOWNERS file', () => {
		const result = parseCodeowners('src/test/fixtures/sample-codeowners.txt');

		assert.deepStrictEqual(result, {
			scopeMap: {
				"*": ["@global-owner1", "@global-owner2"],
				"**/logs": ["@octocat"],
				"*.go": ["docs@example.com"],
				"*.js": ["@js-owner"],
				"*.txt": ["@octo-org/octocats"],
				"/apps/": ["@octocat"],
				"/apps/github": ["@doctocat"],
				"/apps/unloved": [],
				"/build/logs/": ["@doctocat"],
				"/docs/": ["@doctocat"],
				"/scripts/": ["@doctocat", "@octocat"],
				"apps/": ["@octocat"],
				"docs/*": ["docs@example.com"]
			},
			teams: ["@global-owner1", "@global-owner2", "@js-owner", "docs@example.com", "@octo-org/octocats", "@doctocat", "@octocat"]
		});
	});

	test('Should build filter based on selected teams', async () => {
		const selectedTeams = ["@octocat", "@doctocat"]
		const { scopeMap } = parseCodeowners('src/test/fixtures/sample-codeowners.txt');

		const allFiles = [
			{ fsPath: '/config.ru' } as vscode.Uri,
			{ fsPath: '/app/javascript/sauce.js' } as vscode.Uri,
			{ fsPath: '/just.go' } as vscode.Uri,
			{ fsPath: '/important.txt' } as vscode.Uri,
			{ fsPath: '/build/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/docs/README.md' } as vscode.Uri,
			{ fsPath: '/apps/shiny/toy.rb' } as vscode.Uri,
			{ fsPath: '/docs/API/README.md' } as vscode.Uri,
			{ fsPath: '/scripts/debugging.sh' } as vscode.Uri,
			{ fsPath: '/apps/unicorns/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/unloved' } as vscode.Uri,
			{ fsPath: '/apps/puma/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/puma/app/knowledge.rb' } as vscode.Uri,
			{ fsPath: '/apps/github/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/github/app/secrets.txt' } as vscode.Uri,
		];

		const resultingFilesFiltered = buildFileExclusionFilter(selectedTeams, scopeMap, allFiles)

		const expectedFilteredFiles = {
			'/app/javascript/sauce.js': true,
			'/config.ru': true,
			'/important.txt': true,
			'/just.go': true
		}

    const resultingFilesDisplayed = allFiles
        .map(file => file.fsPath)
        .filter(path => !Object.keys(expectedFilteredFiles).includes(path));

		assert.deepEqual(resultingFilesFiltered, expectedFilteredFiles);

		assert.deepEqual(resultingFilesDisplayed, [
			'/build/logs/foo.log',
			'/docs/README.md',
			'/apps/shiny/toy.rb',
			'/docs/API/README.md',
			'/scripts/debugging.sh',
			'/apps/unicorns/logs/foo.log',
			'/apps/unloved',
			'/apps/puma/logs/foo.log',
			'/apps/puma/app/knowledge.rb',
			'/apps/github/logs/foo.log',
			'/apps/github/app/secrets.txt',
		])
	});

	test('Should remove filter when no teams are selected', async () => {
		const selectedTeams: string[] = []
		const { scopeMap } = parseCodeowners('src/test/fixtures/sample-codeowners.txt');

		const allFiles = [
			{ fsPath: '/config.ru' } as vscode.Uri,
			{ fsPath: '/app/javascript/sauce.js' } as vscode.Uri,
			{ fsPath: '/just.go' } as vscode.Uri,
			{ fsPath: '/important.txt' } as vscode.Uri,
			{ fsPath: '/build/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/docs/README.md' } as vscode.Uri,
			{ fsPath: '/apps/shiny/toy.rb' } as vscode.Uri,
			{ fsPath: '/docs/API/README.md' } as vscode.Uri,
			{ fsPath: '/scripts/debugging.sh' } as vscode.Uri,
			{ fsPath: '/apps/unicorns/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/unloved' } as vscode.Uri,
			{ fsPath: '/apps/puma/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/puma/app/knowledge.rb' } as vscode.Uri,
			{ fsPath: '/apps/github/logs/foo.log' } as vscode.Uri,
			{ fsPath: '/apps/github/app/secrets.txt' } as vscode.Uri,
		];

		const resultingFilesFiltered = buildFileExclusionFilter(selectedTeams, scopeMap, allFiles)

		const expectedFilteredFiles = {}

    const resultingFilesDisplayed = allFiles
        .map(file => file.fsPath)
        .filter(path => !Object.keys(expectedFilteredFiles).includes(path));

		assert.deepEqual(resultingFilesFiltered, expectedFilteredFiles);

		assert.deepEqual(resultingFilesDisplayed, allFiles.map(file => file.fsPath))
	});
});

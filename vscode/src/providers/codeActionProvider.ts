import * as vscode from 'vscode';

export class JavaCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.SourceOrganizeImports,
        vscode.CodeActionKind.SourceFixAll
    ];

    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        const actions: vscode.CodeAction[] = [];

        // Organize Imports action
        const organizeImportsAction = new vscode.CodeAction(
            'Organize Java Imports (Accenture)',
            vscode.CodeActionKind.SourceOrganizeImports
        );
        organizeImportsAction.command = {
            command: 'accentureJava.format.organizeImports',
            title: 'Organize Imports',
            arguments: [document.uri]
        };
        actions.push(organizeImportsAction);

        // Format Document action
        const formatDocumentAction = new vscode.CodeAction(
            'Format Java Document (Accenture)',
            vscode.CodeActionKind.SourceFixAll
        );
        formatDocumentAction.command = {
            command: 'accentureJava.format.document',
            title: 'Format Document',
            arguments: [document.uri]
        };
        actions.push(formatDocumentAction);

        return actions;
    }
}

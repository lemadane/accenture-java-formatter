import * as vscode from 'vscode';
import { getFormatterConfig } from '../formatter/config';
import { JavaFormatter } from '../formatter/javaFormatter';

export class JavaFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    
    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const config = getFormatterConfig(document);
        if (!config.insertSpaces) {
            config.insertSpaces = options.insertSpaces;
        }
        if (options.tabSize) {
            config.tabSize = options.tabSize;
        }

        const formatter = new JavaFormatter(config);
        const originalText = document.getText();
        const formattedText = formatter.formatDocument(originalText);

        if (originalText === formattedText) {
            return [];
        }

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(originalText.length)
        );

        return [vscode.TextEdit.replace(fullRange, formattedText)];
    }

    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const config = getFormatterConfig(document);
        config.insertSpaces = options.insertSpaces;
        config.tabSize = options.tabSize;

        const formatter = new JavaFormatter(config);
        const originalText = document.getText();
        
        const formattedText = formatter.formatRange(originalText, range.start.line, range.end.line);
        if (originalText === formattedText) {
            return [];
        }

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(originalText.length)
        );

        return [vscode.TextEdit.replace(fullRange, formattedText)];
    }
}

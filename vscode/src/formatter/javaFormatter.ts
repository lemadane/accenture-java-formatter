import { FormatterConfig } from './config';
import { AstFormattingEngine } from './ast/engine';

export class JavaFormatter {
    private readonly astEngine: AstFormattingEngine;

    constructor(config: FormatterConfig) {
        this.astEngine = new AstFormattingEngine(config);
    }

    public formatDocument(sourceCode: string): string {
        return this.astEngine.formatDocument(sourceCode);
    }

    public formatRange(sourceCode: string, startLine: number, endLine: number): string {
        return this.astEngine.formatRange(sourceCode, startLine, endLine);
    }
}

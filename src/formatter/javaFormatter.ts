import { FormatterConfig } from './config';
import { organizeJavaImports } from './organizeImports';

export class JavaFormatter {
    private config: FormatterConfig;

    constructor(config: FormatterConfig) {
        this.config = config;
    }

    public formatDocument(sourceCode: string): string {
        const rawLines = sourceCode.split(/\r?\n/);
        
        // 1. Organize imports if enabled
        let lines = rawLines;
        if (this.config.organizeImportsOnFormat) {
            const importResult = organizeJavaImports(lines);
            if (importResult.hasImports) {
                const beforeImports = lines.slice(0, importResult.startLineIndex);
                const afterImports = lines.slice(importResult.endLineIndex + 1);
                const organizedLines = importResult.importsText.split('\n');
                lines = [...beforeImports, ...organizedLines, ...afterImports];
            }
        }

        // 2. Format structure, indentation, braces, annotations & line wrapping
        return this.formatCodeLines(lines);
    }

    public formatRange(sourceCode: string, startLine: number, endLine: number): string {
        const rawLines = sourceCode.split(/\r?\n/);
        const targetRange = rawLines.slice(startLine, endLine + 1);
        
        // Compute base indent of range start
        let baseIndentLevel = 0;
        for (let i = 0; i < Math.min(startLine, rawLines.length); i++) {
            const line = rawLines[i].trim();
            if (line.endsWith('{') || line.endsWith('(')) {
                baseIndentLevel++;
            }
            if (line.startsWith('}') || line.startsWith(')')) {
                baseIndentLevel = Math.max(0, baseIndentLevel - 1);
            }
        }

        const formattedRangeLines = this.formatLinesWithIndent(targetRange, baseIndentLevel);
        
        const before = rawLines.slice(0, startLine);
        const after = rawLines.slice(endLine + 1);
        return [...before, ...formattedRangeLines, ...after].join('\n');
    }

    private formatCodeLines(lines: string[]): string {
        const formatted = this.formatLinesWithIndent(lines, 0);
        return this.postProcessBlankLines(formatted).join('\n');
    }

    private formatLinesWithIndent(lines: string[], initialIndentLevel: number): string[] {
        const indentStr = this.config.insertSpaces ? ' '.repeat(this.config.tabSize) : '\t';
        let blockIndent = initialIndentLevel;
        let parenIndent = 0;
        const outputLines: string[] = [];

        let inJavadoc = false;
        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Empty lines
            if (line === '') {
                outputLines.push('');
                continue;
            }

            const currentIndent = Math.max(0, blockIndent + parenIndent);

            // Javadoc and block comment handling
            if (line.startsWith('/**')) {
                inJavadoc = true;
                outputLines.push(indentStr.repeat(currentIndent) + line);
                if (line.endsWith('*/')) inJavadoc = false;
                continue;
            }
            if (inJavadoc) {
                if (line.startsWith('*')) {
                    outputLines.push(indentStr.repeat(currentIndent) + ' ' + line);
                } else {
                    outputLines.push(indentStr.repeat(currentIndent) + line);
                }
                if (line.includes('*/')) inJavadoc = false;
                continue;
            }

            if (line.startsWith('/*')) {
                inBlockComment = true;
                outputLines.push(indentStr.repeat(currentIndent) + line);
                if (line.endsWith('*/')) inBlockComment = false;
                continue;
            }
            if (inBlockComment) {
                outputLines.push(indentStr.repeat(currentIndent) + line);
                if (line.includes('*/')) inBlockComment = false;
                continue;
            }

            // Single line comments
            if (line.startsWith('//')) {
                outputLines.push(indentStr.repeat(currentIndent) + line);
                continue;
            }

            // Adjust indent for closing symbols at line start
            const startsWithClosingBrace = line.startsWith('}');
            if (startsWithClosingBrace) {
                blockIndent = Math.max(0, blockIndent - 1);
            }
            const startsWithClosingParen = line.startsWith(')') || line.startsWith(');');
            if (startsWithClosingParen) {
                parenIndent = Math.max(0, parenIndent - 2);
            }

            // Handle brace style option (nextLine vs sameLine)
            if (this.config.braceStyle === 'nextLine' && line.endsWith('{') && line.length > 1 && !line.startsWith('class ') && !line.startsWith('interface ')) {
                const codeWithoutBrace = line.slice(0, -1).trim();
                if (codeWithoutBrace.length > 0) {
                    const lineIndent = Math.max(0, blockIndent + parenIndent);
                    outputLines.push(indentStr.repeat(lineIndent) + codeWithoutBrace);
                    outputLines.push(indentStr.repeat(lineIndent) + '{');
                    blockIndent++;
                    continue;
                }
            }

            // Format control flow statements: space after if, for, while, switch, catch
            line = this.normalizeControlFlowSpaces(line);

            // Format comparison operators: spaces around ==, !=, <=, >=
            line = this.normalizeOperatorSpaces(line);

            // Format commas: space after comma
            line = this.normalizeCommaSpaces(line);

            // Format opening braces: space before {
            line = this.normalizeBraceSpaces(line);

            // Format annotation styling
            line = this.normalizeAnnotationSpaces(line);

            // Output current formatted line
            const lineIndentLevel = Math.max(0, blockIndent + parenIndent);
            const currentLineIndent = indentStr.repeat(lineIndentLevel);
            const fullLine = currentLineIndent + line;

            // Line length wrapping check
            if (fullLine.length > this.config.maxLineLength && !line.startsWith('package ') && !line.startsWith('import ')) {
                const wrapped = this.wrapLongLine(line, lineIndentLevel, indentStr);
                outputLines.push(...wrapped);
            } else {
                outputLines.push(fullLine);
            }

            // Strip string literals to safely count structure tokens
            const codeWithoutStrings = line.replace(/"([^"\\]|\\.)*"/g, '""').replace(/'([^'\\]|\\.)*'/g, "''");

            // Character by character token scanner for net indent updates
            for (let chIdx = 0; chIdx < codeWithoutStrings.length; chIdx++) {
                const char = codeWithoutStrings[chIdx];
                if (char === '{') {
                    blockIndent++;
                } else if (char === '}') {
                    if (!startsWithClosingBrace) {
                        blockIndent = Math.max(0, blockIndent - 1);
                    }
                } else if (char === '(' || char === '[') {
                    parenIndent += 2; // 2x continuation indent (4 spaces) for record parameters / arguments
                } else if (char === ')' || char === ']') {
                    if (!startsWithClosingParen) {
                        parenIndent = Math.max(0, parenIndent - 2);
                    }
                }
            }
        }

        return outputLines;
    }

    private normalizeControlFlowSpaces(line: string): string {
        return line
            .replace(/\bif\s*\(/g, 'if (')
            .replace(/\bfor\s*\(/g, 'for (')
            .replace(/\bwhile\s*\(/g, 'while (')
            .replace(/\bswitch\s*\(/g, 'switch (')
            .replace(/\bcatch\s*\(/g, 'catch (')
            .replace(/\}\s*else\s*if\b/g, '} else if')
            .replace(/\}\s*else\b/g, '} else')
            .replace(/\}\s*catch\b/g, '} catch')
            .replace(/\}\s*finally\b/g, '} finally');
    }

    private normalizeAnnotationSpaces(line: string): string {
        // e.g. @Override @Autowired @Table(name="users")
        return line.replace(/@([a-zA-Z0-9_]+)\s*\(\s*/g, '@$1(');
    }

    private normalizeOperatorSpaces(line: string): string {
        return line
            .replace(/([^!=><])==([^=])/g, '$1 == $2')
            .replace(/([^!])!=([^=])/g, '$1 != $2')
            .replace(/([^<])<=([^=])/g, '$1 <= $2')
            .replace(/([^>])>=([^=])/g, '$1 >= $2');
    }

    private normalizeCommaSpaces(line: string): string {
        return line.replace(/,([^\s\/\*])/g, ', $1');
    }

    private normalizeBraceSpaces(line: string): string {
        return line.replace(/([a-zA-Z0-9_\>\]\)])\{/g, '$1 {');
    }

    private wrapLongLine(line: string, indentLevel: number, indentStr: string): string[] {
        // Simple intelligent split at commas, method call chains, or binary operators
        const baseIndent = indentStr.repeat(indentLevel);
        const continuationIndent = indentStr.repeat(indentLevel + 1);

        if (line.includes(', ') && !line.startsWith('@')) {
            const parts = line.split(', ');
            const lines: string[] = [baseIndent + parts[0] + ','];
            for (let i = 1; i < parts.length; i++) {
                const isLast = i === parts.length - 1;
                lines.push(continuationIndent + parts[i] + (isLast ? '' : ','));
            }
            return lines;
        }

        return [baseIndent + line];
    }

    private postProcessBlankLines(lines: string[]): string[] {
        const result: string[] = [];
        let consecutiveEmpty = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isEmpty = line.trim() === '';

            if (isEmpty) {
                consecutiveEmpty++;
                if (consecutiveEmpty <= 1) {
                    result.push(line);
                }
            } else {
                consecutiveEmpty = 0;
                result.push(line);
            }
        }

        return result;
    }
}

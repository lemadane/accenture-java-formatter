import { FormatterConfig } from './config';
import { organizeJavaImports } from './organizeImports';

export class JavaFormatter {
    private config: FormatterConfig;

    constructor(config: FormatterConfig) {
        this.config = config;
    }

    public formatDocument(sourceCode: string): string {
        let lines = sourceCode.split(/\r?\n/);
        
        // 1. Organize imports if enabled
        if (this.config.organizeImportsOnFormat) {
            const importResult = organizeJavaImports(lines);
            if (importResult.hasImports) {
                const beforeImports = lines.slice(0, importResult.startLineIndex);
                const afterImports = lines.slice(importResult.endLineIndex + 1);
                const organizedLines = importResult.importsText.split('\n');
                lines = [...beforeImports, ...organizedLines, ...afterImports];
            }
        }

        // 2. Pre-process AST formatting rules (Rules 1-8)
        lines = this.preprocessFormattingRules(lines);

        // 3. Format structure, indentation, braces, annotations & line wrapping (Rule 9)
        return this.formatCodeLines(lines);
    }

    public formatRange(sourceCode: string, startLine: number, endLine: number): string {
        const rawLines = sourceCode.split(/\r?\n/);
        const targetRange = rawLines.slice(startLine, endLine + 1);
        
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

        const processedRange = this.preprocessFormattingRules(targetRange);
        const formattedRangeLines = this.formatLinesWithIndent(processedRange, baseIndentLevel);
        
        const before = rawLines.slice(0, startLine);
        const after = rawLines.slice(endLine + 1);
        return [...before, ...formattedRangeLines, ...after].join('\n');
    }

    private preprocessFormattingRules(lines: string[]): string[] {
        let result = lines;

        // Rule 5: extends, implements, throws on next line
        result = this.applyRule5Clauses(result);

        // Rule 4: Multiline method/constructor parameters (>1)
        result = this.applyRule4MethodParams(result);

        // Rule 1: Annotations on dedicated lines (runs after method params to ensure inline param annotations split)
        result = this.applyRule1Annotations(result);

        // Rule 7 & Rule 9: Assignment statement RHS split
        result = this.applyRule7AssignmentRhs(result);

        // Rule 6: Method calls with >1 argument multiline
        result = this.applyRule6MethodCalls(result);

        // Rule 8: Object chaining >= 2 dots
        result = this.applyRule8ChainedCalls(result);

        return result;
    }

    /**
     * Rule 1: Any annotation should sit on its own dedicated line.
     */
    private applyRule1Annotations(lines: string[]): string[] {
        const output: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.includes('@') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                output.push(line);
                continue;
            }

            const annotationRegex = /@\w+(\([^)]*\))?/g;
            const matches: Array<{ token: string; index: number; length: number }> = [];
            let match: RegExpExecArray | null;

            while ((match = annotationRegex.exec(trimmed)) !== null) {
                matches.push({ token: match[0], index: match.index, length: match[0].length });
            }

            if (matches.length === 0) {
                output.push(line);
                continue;
            }

            if (matches.length === 1 && matches[0].index === 0 && matches[0].length === trimmed.length) {
                output.push(line);
                continue;
            }

            let lastIdx = 0;
            for (const m of matches) {
                const textBefore = trimmed.slice(lastIdx, m.index).trim();
                if (textBefore !== '') {
                    output.push(textBefore);
                }
                output.push(m.token);
                lastIdx = m.index + m.length;
            }

            const textAfter = trimmed.slice(lastIdx).trim();
            if (textAfter !== '') {
                output.push(textAfter);
            }
        }

        return output;
    }

    /**
     * Rule 5: extends, implements, throws on the next line together with associated class/interface/exception
     */
    private applyRule5Clauses(lines: string[]): string[] {
        const output: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                output.push(line);
                continue;
            }

            const hasExtends = /\bextends\b/.test(trimmed) && !trimmed.startsWith('extends');
            const hasImplements = /\bimplements\b/.test(trimmed) && !trimmed.startsWith('implements');
            const hasThrows = /\bthrows\b/.test(trimmed) && !trimmed.startsWith('throws');

            if (!hasExtends && !hasImplements && !hasThrows) {
                output.push(line);
                continue;
            }

            const clauseRegex = /\b(extends|implements|throws)\b/g;
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            const parts: string[] = [];

            while ((match = clauseRegex.exec(trimmed)) !== null) {
                const partBefore = trimmed.slice(lastIndex, match.index).trim();
                if (partBefore !== '') {
                    parts.push(partBefore);
                }
                lastIndex = match.index;
            }

            const finalPart = trimmed.slice(lastIndex).trim();
            if (finalPart !== '') {
                parts.push(finalPart);
            }

            for (const part of parts) {
                output.push(part);
            }
        }

        return output;
    }

    /**
     * Rule 4: Method/constructor declarations with >1 argument formatted multiline (1 per line).
     */
    private applyRule4MethodParams(lines: string[]): string[] {
        const output: string[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            const isMethodOrConstructorStart =
                trimmed.includes('(') &&
                !trimmed.includes('record ') && !trimmed.includes('class ') && !trimmed.includes('interface ') &&
                (trimmed.startsWith('public ') || trimmed.startsWith('protected ') || trimmed.startsWith('private ') || trimmed.startsWith('abstract ')) &&
                !trimmed.startsWith('if') &&
                !trimmed.startsWith('for') &&
                !trimmed.startsWith('while') &&
                !trimmed.startsWith('switch') &&
                !trimmed.startsWith('catch') &&
                !trimmed.startsWith('return') &&
                !trimmed.includes(' = ');

            if (isMethodOrConstructorStart) {
                let j = i + 1;
                let fullText = trimmed;

                while (j < lines.length && !fullText.includes(') {') && !fullText.endsWith('{') && !fullText.endsWith(');') && !fullText.endsWith(')')) {
                    const nextTrimmed = lines[j].trim();
                    fullText += ' ' + nextTrimmed;
                    j++;
                }

                const openParenIdx = fullText.indexOf('(');
                const closeParenIdx = fullText.lastIndexOf(')');

                if (openParenIdx !== -1 && closeParenIdx > openParenIdx) {
                    const headerPrefix = fullText.slice(0, openParenIdx).trim();
                    const paramsContent = fullText.slice(openParenIdx + 1, closeParenIdx).trim();
                    const headerSuffix = fullText.slice(closeParenIdx + 1).trim();

                    if (paramsContent !== '') {
                        const rawParams = this.splitParameters(paramsContent);
                        const processedParams = rawParams.map(p => p.trim());

                        if (processedParams.length > 1) {
                            output.push(`${headerPrefix}(`);
                            for (let pIdx = 0; pIdx < processedParams.length; pIdx++) {
                                const isLast = pIdx === processedParams.length - 1;
                                if (isLast) {
                                    output.push(`${processedParams[pIdx]})${headerSuffix ? ' ' + headerSuffix : ''}`);
                                } else {
                                    output.push(`${processedParams[pIdx]},`);
                                }
                            }
                            i = j;
                            continue;
                        } else {
                            output.push(`${headerPrefix}(${processedParams[0]})${headerSuffix ? ' ' + headerSuffix : ''}`);
                            i = j;
                            continue;
                        }
                    }
                }
            }

            output.push(line);
            i++;
        }

        return output;
    }

    /**
     * Rule 6: Method call/implementation with >1 arguments formatted on next line per argument.
     */
    private applyRule6MethodCalls(lines: string[]): string[] {
        const output: string[] = [];

        for (const line of lines) {
            let trimmed = line.trim();
            let isRhs = false;
            if (trimmed.startsWith('ASSIGN_RHS:')) {
                isRhs = true;
                trimmed = trimmed.slice('ASSIGN_RHS:'.length).trim();
            }

            const isMethodCall =
                trimmed.includes('(') &&
                (trimmed.endsWith(');') || trimmed.endsWith(')')) &&
                !trimmed.startsWith('public ') &&
                !trimmed.startsWith('private ') &&
                !trimmed.startsWith('protected ') &&
                !trimmed.startsWith('class ') &&
                !trimmed.startsWith('if ') &&
                !trimmed.startsWith('for ') &&
                !trimmed.startsWith('while ');

            if (isMethodCall) {
                const openParenIdx = trimmed.indexOf('(');
                const closeParenIdx = trimmed.lastIndexOf(')');

                if (openParenIdx !== -1 && closeParenIdx > openParenIdx) {
                    const callPrefix = trimmed.slice(0, openParenIdx).trim();
                    const argsContent = trimmed.slice(openParenIdx + 1, closeParenIdx).trim();
                    const callSuffix = trimmed.slice(closeParenIdx + 1).trim();

                    if (argsContent !== '') {
                        const args = this.splitParameters(argsContent);
                        if (args.length > 1) {
                            const prefix = isRhs ? `ASSIGN_RHS:${callPrefix}` : callPrefix;
                            output.push(`${prefix}(`);
                            for (let aIdx = 0; aIdx < args.length; aIdx++) {
                                const isLast = aIdx === args.length - 1;
                                if (isLast) {
                                    output.push(`${args[aIdx].trim()})${callSuffix}`);
                                } else {
                                    output.push(`${args[aIdx].trim()},`);
                                }
                            }
                            continue;
                        }
                    }
                }
            }

            output.push(isRhs ? `ASSIGN_RHS:${trimmed}` : line);
        }

        return output;
    }

    /**
     * Rule 8: On chaining objects, if an object or 'this' has 2 or more chained objects/methods,
     * break each chained call (starting from second dot) onto next line including their dot.
     * Top-level chained calls (outside paren arguments) are evaluated.
     */
    private applyRule8ChainedCalls(lines: string[]): string[] {
        const output: string[] = [];

        for (const line of lines) {
            let trimmed = line.trim();
            let isRhs = false;
            if (trimmed.startsWith('ASSIGN_RHS:')) {
                isRhs = true;
                trimmed = trimmed.slice('ASSIGN_RHS:'.length).trim();
            }

            if (trimmed.startsWith('import ') || trimmed.startsWith('package ') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
                output.push(line);
                continue;
            }

            // Find top-level chained method calls (dots at parenDepth === 0)
            const topLevelDotIndices: number[] = [];
            let parenDepth = 0;
            let bracketDepth = 0;
            let inString = false;
            let stringChar = '';

            for (let idx = 0; idx < trimmed.length; idx++) {
                const char = trimmed[idx];
                if (inString) {
                    if (char === stringChar && trimmed[idx - 1] !== '\\') {
                        inString = false;
                    }
                    continue;
                }
                if (char === '"' || char === "'") {
                    inString = true;
                    stringChar = char;
                    continue;
                }
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
                else if (char === '[') bracketDepth++;
                else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
                else if (char === '.' && parenDepth === 0 && bracketDepth === 0) {
                    topLevelDotIndices.push(idx);
                }
            }

            const methodDotIndices = topLevelDotIndices.filter(idx => {
                const rest = trimmed.slice(idx);
                return /^\.[a-zA-Z0-9_]+\s*\(/.test(rest);
            });

            if (methodDotIndices.length >= 2) {
                const secondDotIdx = methodDotIndices[1];
                const firstPart = trimmed.slice(0, secondDotIdx).trim();
                const restPart = trimmed.slice(secondDotIdx).trim();

                output.push(isRhs ? `ASSIGN_RHS:${firstPart}` : firstPart);

                const subChainParts: string[] = [];
                let currentSubPart = '';
                let subParenDepth = 0;

                for (let idx = 0; idx < restPart.length; idx++) {
                    const char = restPart[idx];
                    if (char === '(') subParenDepth++;
                    else if (char === ')') subParenDepth = Math.max(0, subParenDepth - 1);

                    if (char === '.' && subParenDepth === 0 && idx > 0) {
                        const rest = restPart.slice(idx);
                        if (/^\.[a-zA-Z0-9_]+\s*\(/.test(rest)) {
                            if (currentSubPart.trim()) {
                                subChainParts.push(currentSubPart.trim());
                            }
                            currentSubPart = '';
                        }
                    }
                    currentSubPart += char;
                }
                if (currentSubPart.trim()) {
                    subChainParts.push(currentSubPart.trim());
                }

                for (const subPart of subChainParts) {
                    if (subPart.trim() !== '') {
                        const splitSub = this.splitLambdaChainedCalls(subPart.trim());
                        for (const s of splitSub) {
                            output.push(s);
                        }
                    }
                }
                continue;
            }

            const splitLine = this.splitLambdaChainedCalls(line);
            if (splitLine.length > 1) {
                for (const s of splitLine) {
                    output.push(s);
                }
            } else {
                output.push(isRhs ? `ASSIGN_RHS:${trimmed}` : line);
            }
        }

        return output;
    }

    private splitLambdaChainedCalls(line: string): string[] {
        let isRhs = false;
        let trimmed = line.trim();
        if (trimmed.startsWith('ASSIGN_RHS:')) {
            isRhs = true;
            trimmed = trimmed.slice('ASSIGN_RHS:'.length).trim();
        }

        const lambdaIdx = trimmed.indexOf('->');
        if (lambdaIdx === -1) {
            return [line];
        }

        const lambdaBody = trimmed.slice(lambdaIdx + 2);
        const dotRegex = /\.[a-zA-Z0-9_]+\s*\(/g;
        const matches: Array<{ token: string; index: number }> = [];
        let match: RegExpExecArray | null;

        while ((match = dotRegex.exec(lambdaBody)) !== null) {
            matches.push({ token: match[0], index: match.index });
        }

        if (matches.length >= 2) {
            const result: string[] = [];
            const secondDotIdxInBody = matches[1].index;
            const splitIdx = (lambdaIdx + 2) + secondDotIdxInBody;

            const part1 = trimmed.slice(0, splitIdx).trim();
            result.push(isRhs ? `ASSIGN_RHS:${part1}` : part1);

            const remaining = trimmed.slice(splitIdx).trim();
            const remMatches: Array<{ token: string; index: number }> = [];
            let remMatch: RegExpExecArray | null;
            const remDotRegex = /\.[a-zA-Z0-9_]+\s*\(/g;
            while ((remMatch = remDotRegex.exec(remaining)) !== null) {
                remMatches.push({ token: remMatch[0], index: remMatch.index });
            }

            if (remMatches.length <= 1) {
                result.push(remaining);
            } else {
                let remLastIdx = 0;
                for (let k = 1; k < remMatches.length; k++) {
                    const chunk = remaining.slice(remLastIdx, remMatches[k].index).trim();
                    if (chunk) result.push(chunk);
                    remLastIdx = remMatches[k].index;
                }
                const lastChunk = remaining.slice(remLastIdx).trim();
                if (lastChunk) result.push(lastChunk);
            }

            return result;
        }

        return [line];
    }


    /**
     * Rule 7 & Rule 9: On assignment statements, right hand side of '=' can be on the next line.
     * The RHS is only forced onto the next line if the line length reaches maxLineLength (80).
     * If the RHS is already on the next line (user split it) or wrapped due to line length, it is indented 2x (4 spaces).
     */
    private applyRule7AssignmentRhs(lines: string[]): string[] {
        const output: string[] = [];
        let pendingAssignRhs = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let trimmed = line.trim();

            if (pendingAssignRhs) {
                pendingAssignRhs = false;
                output.push(`ASSIGN_RHS:${trimmed}`);
                continue;
            }

            trimmed = this.normalizeAssignmentSpaces(trimmed);
            trimmed = this.normalizeParenSpaces(trimmed);

            const isAssignment =
                trimmed.includes(' = ') &&
                !trimmed.startsWith('for ') &&
                !trimmed.startsWith('if ') &&
                !trimmed.startsWith('while ') &&
                !trimmed.endsWith('{');

            if (isAssignment) {
                const eqIdx = trimmed.indexOf(' = ');
                if (eqIdx !== -1) {
                    const lhs = trimmed.slice(0, eqIdx + 2).trim();
                    const rhs = trimmed.slice(eqIdx + 3).trim();

                    if (line.length >= this.config.maxLineLength) {
                        output.push(lhs);
                        output.push(`ASSIGN_RHS:${rhs}`);
                        continue;
                    }
                }
            }

            const isLineEndingWithEquals =
                (trimmed.endsWith(' =') || trimmed.endsWith('=')) &&
                !trimmed.startsWith('for ') &&
                !trimmed.startsWith('if ') &&
                !trimmed.startsWith('while ') &&
                !trimmed.endsWith('{');

            if (isLineEndingWithEquals) {
                output.push(trimmed);
                pendingAssignRhs = true;
                continue;
            }

            output.push(line);
        }

        return output;
    }

    private splitParameters(paramsContent: string): string[] {
        const result: string[] = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < paramsContent.length; i++) {
            const char = paramsContent[i];
            if (char === '<' || char === '(' || char === '[') {
                depth++;
                current += char;
            } else if (char === '>' || char === ')' || char === ']') {
                depth = Math.max(0, depth - 1);
                current += char;
            } else if (char === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim() !== '') {
            result.push(current.trim());
        }

        return result;
    }

    private formatCodeLines(lines: string[]): string {
        const formatted = this.formatLinesWithIndent(lines, 0);
        return this.postProcessBlankLines(formatted).join('\n');
    }

    private formatLinesWithIndent(lines: string[], initialIndentLevel: number): string[] {
        const indentStr = this.config.insertSpaces ? ' '.repeat(this.config.tabSize) : '\t';
        let blockIndent = initialIndentLevel;
        const parenIndentStack: number[] = [];
        const outputLines: string[] = [];

        let inJavadoc = false;
        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (line === '') {
                outputLines.push('');
                continue;
            }

            let isAssignRhs = false;
            if (line.startsWith('ASSIGN_RHS:')) {
                line = line.slice('ASSIGN_RHS:'.length).trim();
                isAssignRhs = true;
            }

            const startsWithClosingBrace = line.startsWith('}');
            if (startsWithClosingBrace) {
                blockIndent = Math.max(0, blockIndent - 1);
            }
            const startsWithClosingParen = line.startsWith(')') || line.startsWith(');');
            if (startsWithClosingParen && parenIndentStack.length > 0) {
                parenIndentStack.pop();
            }

            const parenIndent = parenIndentStack.length > 0 ? parenIndentStack[parenIndentStack.length - 1] : 0;
            const isContinuationLine = isAssignRhs || line.startsWith('.') || line.startsWith('extends') || line.startsWith('implements') || line.startsWith('throws');
            const extraIndent = isContinuationLine ? 2 : 0;
            const lineIndentLevel = Math.max(0, blockIndent + parenIndent + extraIndent);

            if (line.startsWith('/**')) {
                inJavadoc = true;
                outputLines.push(indentStr.repeat(lineIndentLevel) + line);
                if (line.endsWith('*/')) inJavadoc = false;
                continue;
            }
            if (inJavadoc) {
                if (line.startsWith('*')) {
                    outputLines.push(indentStr.repeat(lineIndentLevel) + ' ' + line);
                } else {
                    outputLines.push(indentStr.repeat(lineIndentLevel) + line);
                }
                if (line.includes('*/')) inJavadoc = false;
                continue;
            }

            if (line.startsWith('/*')) {
                inBlockComment = true;
                outputLines.push(indentStr.repeat(lineIndentLevel) + line);
                if (line.endsWith('*/')) inBlockComment = false;
                continue;
            }
            if (inBlockComment) {
                outputLines.push(indentStr.repeat(lineIndentLevel) + line);
                if (line.includes('*/')) inBlockComment = false;
                continue;
            }

            if (line.startsWith('//')) {
                outputLines.push(indentStr.repeat(lineIndentLevel) + line);
                continue;
            }

            if (this.config.braceStyle === 'nextLine' && line.endsWith('{') && line.length > 1 && !line.startsWith('class ') && !line.startsWith('interface ')) {
                const codeWithoutBrace = line.slice(0, -1).trim();
                if (codeWithoutBrace.length > 0) {
                    outputLines.push(indentStr.repeat(lineIndentLevel) + codeWithoutBrace);
                    outputLines.push(indentStr.repeat(lineIndentLevel) + '{');
                    blockIndent++;
                    continue;
                }
            }

            line = this.normalizeControlFlowSpaces(line);
            line = this.normalizeAssignmentSpaces(line);
            line = this.normalizeOperatorSpaces(line);
            line = this.normalizeParenSpaces(line);
            line = this.normalizeCommaSpaces(line);
            line = this.normalizeBraceSpaces(line);
            line = this.normalizeAnnotationSpaces(line);

            const currentLineIndent = indentStr.repeat(lineIndentLevel);
            const fullLine = currentLineIndent + line;

            outputLines.push(fullLine);

            const codeWithoutStrings = line.replace(/"([^"\\]|\\.)*"/g, '""').replace(/'([^'\\]|\\.)*'/g, "''");

            for (let chIdx = 0; chIdx < codeWithoutStrings.length; chIdx++) {
                const char = codeWithoutStrings[chIdx];
                if (char === '{') {
                    blockIndent++;
                } else if (char === '}') {
                    if (!startsWithClosingBrace) {
                        blockIndent = Math.max(0, blockIndent - 1);
                    }
                } else if (char === '(' || char === '[') {
                    const textAfterParen = codeWithoutStrings.slice(chIdx + 1).trim();
                    const hasCodeAfterParen = textAfterParen !== '' && !textAfterParen.startsWith('//');
                    const addedParenIndent = hasCodeAfterParen
                        ? (parenIndentStack.length > 0 ? parenIndentStack[parenIndentStack.length - 1] : 2)
                        : (lineIndentLevel + 2 - blockIndent);
                    parenIndentStack.push(addedParenIndent);
                } else if (char === ')' || char === ']') {

                    if (!startsWithClosingParen && parenIndentStack.length > 0) {
                        parenIndentStack.pop();
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

    private normalizeAssignmentSpaces(line: string): string {
        if (line.includes('==') || line.includes('!=') || line.includes('<=') || line.includes('>=') || line.includes('->')) {
            return line;
        }
        return line.replace(/([a-zA-Z0-9_\>\]\)])=([a-zA-Z0-9_\<\(\"\@])/g, '$1 = $2');
    }

    private normalizeParenSpaces(line: string): string {
        // Protect string literals while removing excess inner paren spaces
        const parts: string[] = [];
        const regex = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g;
        let lastIdx = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
            const codeBefore = line.slice(lastIdx, match.index);
            parts.push(codeBefore.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')'));
            parts.push(match[0]); // keep string literal unchanged
            lastIdx = match.index + match[0].length;
        }

        const codeRest = line.slice(lastIdx);
        parts.push(codeRest.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')'));

        return parts.join('');
    }

    private normalizeAnnotationSpaces(line: string): string {
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

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

        // Rule 1: Annotations on dedicated lines
        result = this.applyRule1Annotations(result);

        // Rule 5: extends, implements, throws on next line
        result = this.applyRule5Clauses(result);

        // Rule 3 & Rule 4: final keyword & multiline method/constructor parameters (>1)
        result = this.applyRule3And4MethodParams(result);

        // Rule 7 & Rule 9: Assignment statement RHS split (run before method call split to mark assignment continuation)
        result = this.applyRule7AssignmentRhs(result);

        // Rule 2: this. prefix on class fields inside implementations (protecting parameters & locals)
        result = this.applyRule2ThisPrefix(result);

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

            const firstMatchIdx = matches[0].index;
            const lastMatchEnd = matches[matches.length - 1].index + matches[matches.length - 1].length;
            const remainder = trimmed.slice(lastMatchEnd).trim();

            if (firstMatchIdx === 0 && matches.length === 1 && remainder === '') {
                output.push(line);
                continue;
            }

            for (const m of matches) {
                output.push(m.token);
            }

            if (remainder !== '') {
                output.push(remainder);
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
     * Rule 3: Add 'final' keyword to method/constructor arguments.
     * Rule 4: Method/constructor declarations with >1 argument formatted multiline (1 per line).
     */
    private applyRule3And4MethodParams(lines: string[]): string[] {
        const output: string[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            const isMethodOrConstructor =
                trimmed.includes('(') &&
                (trimmed.endsWith('{') || (trimmed.endsWith(');') && (trimmed.startsWith('public') || trimmed.startsWith('protected') || trimmed.startsWith('private') || trimmed.startsWith('abstract')))) &&
                !trimmed.startsWith('if') &&
                !trimmed.startsWith('for') &&
                !trimmed.startsWith('while') &&
                !trimmed.startsWith('switch') &&
                !trimmed.startsWith('catch') &&
                !trimmed.startsWith('@') &&
                !trimmed.startsWith('record ') &&
                !trimmed.startsWith('return') &&
                !trimmed.includes(' = ');

            if (isMethodOrConstructor) {
                const openParenIdx = trimmed.indexOf('(');
                const closeParenIdx = trimmed.lastIndexOf(')');

                if (openParenIdx !== -1 && closeParenIdx > openParenIdx) {
                    const headerPrefix = trimmed.slice(0, openParenIdx).trim();
                    const paramsContent = trimmed.slice(openParenIdx + 1, closeParenIdx).trim();
                    const headerSuffix = trimmed.slice(closeParenIdx + 1).trim();

                    if (paramsContent !== '') {
                        const rawParams = this.splitParameters(paramsContent);
                        const processedParams = rawParams.map(p => {
                            let pTrim = p.trim();
                            if (!pTrim.startsWith('final ') && !pTrim.startsWith('final\t')) {
                                if (pTrim.startsWith('@')) {
                                    const firstSpace = pTrim.indexOf(' ');
                                    if (firstSpace !== -1) {
                                        pTrim = pTrim.slice(0, firstSpace) + ' final ' + pTrim.slice(firstSpace + 1);
                                    } else {
                                        pTrim = 'final ' + pTrim;
                                    }
                                } else {
                                    pTrim = 'final ' + pTrim;
                                }
                            }
                            return pTrim;
                        });

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
                            i++;
                            continue;
                        } else {
                            output.push(`${headerPrefix}(${processedParams[0]})${headerSuffix ? ' ' + headerSuffix : ''}`);
                            i++;
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
     * Rule 2: Include 'this.' on field implementations throughout class/record methods.
     * Accurately distinguishes class fields from method parameters and local variables.
     */
    private applyRule2ThisPrefix(lines: string[]): string[] {
        const fieldNames = new Set<string>();

        // 1. Collect class field declarations and record components
        for (const line of lines) {
            let trimmed = line.trim();
            if (trimmed.startsWith('ASSIGN_RHS:')) {
                trimmed = trimmed.slice('ASSIGN_RHS:'.length).trim();
            }
            const fieldMatch = /(private|protected|public)\s+(final\s+)?([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*;/g.exec(trimmed);
            if (fieldMatch) {
                fieldNames.add(fieldMatch[4]);
            }
            if (trimmed.includes('record ') || lines.some(l => l.includes('record '))) {
                const recordCompMatch = /([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)(,|\))/g;
                let rMatch: RegExpExecArray | null;
                while ((rMatch = recordCompMatch.exec(trimmed)) !== null) {
                    const candidate = rMatch[2];
                    if (candidate !== 'class' && candidate !== 'interface' && candidate !== 'record' && candidate !== 'implements' && candidate !== 'extends') {
                        fieldNames.add(candidate);
                    }
                }
            }
        }

        if (fieldNames.size === 0) {
            return lines;
        }

        const output: string[] = [];
        let braceDepth = 0;
        let methodParamNames = new Set<string>();
        let localVariableNames = new Set<string>();

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let trimmed = line.trim();
            let prefixMarker = '';
            if (trimmed.startsWith('ASSIGN_RHS:')) {
                prefixMarker = 'ASSIGN_RHS:';
                trimmed = trimmed.slice('ASSIGN_RHS:'.length).trim();
            }

            const isFieldDeclaration = /(private|protected|public)\s+(final\s+)?([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*;/.test(trimmed);
            const isMethodHeader = trimmed.includes('(') && (trimmed.endsWith('{') || trimmed.endsWith(')'));
            const isParameterLine = (trimmed.startsWith('final ') || trimmed.startsWith('@')) && (trimmed.endsWith(',') || trimmed.endsWith(') {') || trimmed.endsWith(')'));

            // Track method parameters in method declarations
            if (isMethodHeader || isParameterLine) {
                const paramMatch = /(?:final\s+)?([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)(?:,|\)|\s*\{)/g;
                let pMatch: RegExpExecArray | null;
                while ((pMatch = paramMatch.exec(trimmed)) !== null) {
                    const paramName = pMatch[2];
                    if (paramName !== 'class' && paramName !== 'interface' && paramName !== 'record' && paramName !== 'public' && paramName !== 'private') {
                        methodParamNames.add(paramName);
                    }
                }
            }

            // Track local variable declarations inside methods (e.g. final var product = ...)
            const localVarMatch = /(?:final\s+)?(?:var|[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*=/g.exec(trimmed);
            if (localVarMatch && braceDepth >= 2) {
                localVariableNames.add(localVarMatch[1]);
            }

            if (trimmed.includes('{')) {
                braceDepth++;
            }

            // Only apply this. prefix inside method body (braceDepth >= 2)
            if (braceDepth >= 2 && !isFieldDeclaration && !isMethodHeader && !isParameterLine && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('package') && !trimmed.startsWith('import')) {
                for (const field of fieldNames) {
                    if (methodParamNames.has(field) || localVariableNames.has(field)) {
                        continue;
                    }
                    const regex = new RegExp(`(?<![\\w.@])(?<!this\\.)\\b${field}\\b(?![\\w:(])`, 'g');
                    trimmed = trimmed.replace(regex, `this.${field}`);
                }
            }

            if (trimmed.startsWith('}')) {
                braceDepth = Math.max(0, braceDepth - 1);
                if (braceDepth <= 1) {
                    methodParamNames.clear();
                    localVariableNames.clear();
                }
            }

            output.push(prefixMarker + trimmed);
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

            const dotMatches = trimmed.match(/\.[a-zA-Z0-9_]+\s*\(/g);
            if (dotMatches && dotMatches.length >= 2) {
                const firstDotIdx = trimmed.indexOf(dotMatches[0]);
                const secondDotIdx = trimmed.indexOf(dotMatches[1], firstDotIdx + dotMatches[0].length);

                if (secondDotIdx !== -1) {
                    const firstPart = trimmed.slice(0, secondDotIdx).trim();
                    const restPart = trimmed.slice(secondDotIdx).trim();

                    output.push(isRhs ? `ASSIGN_RHS:${firstPart}` : firstPart);

                    const subChainParts = restPart.split(/(?=\.[a-zA-Z0-9_]+)/g);
                    for (const subPart of subChainParts) {
                        if (subPart.trim() !== '') {
                            output.push(subPart.trim());
                        }
                    }
                    continue;
                }
            }

            output.push(isRhs ? `ASSIGN_RHS:${trimmed}` : line);
        }

        return output;
    }

    /**
     * Rule 7 & Rule 9: On assignment statements, right hand side of '=' can be on the next line.
     */
    private applyRule7AssignmentRhs(lines: string[]): string[] {
        const output: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

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

                    if (line.length >= this.config.maxLineLength || rhs.length > 15 || rhs.includes('(')) {
                        output.push(lhs);
                        output.push(`ASSIGN_RHS:${rhs}`);
                        continue;
                    }
                }
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
        let parenIndent = 0;
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

            const isContinuationLine = isAssignRhs || line.startsWith('.') || line.startsWith('extends') || line.startsWith('implements') || line.startsWith('throws');
            const extraIndent = isContinuationLine ? 2 : 0;
            const currentIndent = Math.max(0, blockIndent + parenIndent + extraIndent);

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

            if (line.startsWith('//')) {
                outputLines.push(indentStr.repeat(currentIndent) + line);
                continue;
            }

            const startsWithClosingBrace = line.startsWith('}');
            if (startsWithClosingBrace) {
                blockIndent = Math.max(0, blockIndent - 1);
            }
            const startsWithClosingParen = line.startsWith(')') || line.startsWith(');');
            if (startsWithClosingParen) {
                parenIndent = Math.max(0, parenIndent - 2);
            }

            if (this.config.braceStyle === 'nextLine' && line.endsWith('{') && line.length > 1 && !line.startsWith('class ') && !line.startsWith('interface ')) {
                const codeWithoutBrace = line.slice(0, -1).trim();
                if (codeWithoutBrace.length > 0) {
                    const lineIndent = Math.max(0, blockIndent + parenIndent + extraIndent);
                    outputLines.push(indentStr.repeat(lineIndent) + codeWithoutBrace);
                    outputLines.push(indentStr.repeat(lineIndent) + '{');
                    blockIndent++;
                    continue;
                }
            }

            line = this.normalizeControlFlowSpaces(line);
            line = this.normalizeOperatorSpaces(line);
            line = this.normalizeCommaSpaces(line);
            line = this.normalizeBraceSpaces(line);
            line = this.normalizeAnnotationSpaces(line);

            const lineIndentLevel = Math.max(0, blockIndent + parenIndent + extraIndent);
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
                    parenIndent += 2;
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

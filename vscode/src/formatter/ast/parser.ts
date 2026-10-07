import { JavaAstModel } from './types';

function extractPackageDeclaration(sourceCode: string): string | undefined {
  const match = sourceCode.match(/^[\t ]*package\s+([a-zA-Z0-9_.]+)\s*;/m);
  return match ? match[1] : undefined;
}

function extractImports(sourceCode: string): JavaAstModel['importDeclarations'] {
  const lines = sourceCode.split(/\r?\n/);
  const imports: JavaAstModel['importDeclarations'] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*import\s+(static\s+)?([a-zA-Z0-9_.*$]+)\s*;\s*$/);
    if (!m) {
      continue;
    }
    imports.push({
      isStatic: !!m[1],
      qualifiedName: m[2],
      sourceLine: i
    });
  }

  return imports;
}

export function parseJavaAst(sourceCode: string): JavaAstModel {
  const syntaxCheck = runStructuralSyntaxCheck(sourceCode);
  const model: JavaAstModel = {
    parseSucceeded: syntaxCheck.parseSucceeded,
    parseErrors: syntaxCheck.parseErrors,
    packageDeclaration: extractPackageDeclaration(sourceCode),
    importDeclarations: extractImports(sourceCode)
  };

  model.rawTree = {
    packageDeclaration: model.packageDeclaration,
    importCount: model.importDeclarations.length
  };

  return model;
}

function runStructuralSyntaxCheck(sourceCode: string): { parseSucceeded: boolean; parseErrors: string[] } {
  let inString = false;
  let inChar = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inTextBlock = false;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < sourceCode.length; i++) {
    const curr = sourceCode[i];
    const prev = i > 0 ? sourceCode[i - 1] : '';
    const next = i + 1 < sourceCode.length ? sourceCode[i + 1] : '';

    if (inLineComment) {
      if (curr === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (prev === '*' && curr === '/') {
        inBlockComment = false;
      }
      continue;
    }

    if (!inString && !inChar && curr === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (!inString && !inChar && curr === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (!inString && !inChar && curr === '"' && next === '"' && sourceCode[i + 2] === '"') {
      inTextBlock = !inTextBlock;
      i += 2;
      continue;
    }

    if (inTextBlock) {
      continue;
    }

    if (!inChar && curr === '"' && prev !== '\\') {
      inString = !inString;
      continue;
    }

    if (!inString && curr === '\'' && prev !== '\\') {
      inChar = !inChar;
      continue;
    }

    if (inString || inChar) {
      continue;
    }

    if (curr === '{') {
      braceDepth++;
    } else if (curr === '}') {
      braceDepth--;
    } else if (curr === '(') {
      parenDepth++;
    } else if (curr === ')') {
      parenDepth--;
    } else if (curr === '[') {
      bracketDepth++;
    } else if (curr === ']') {
      bracketDepth--;
    }

    if (braceDepth < 0 || parenDepth < 0 || bracketDepth < 0) {
      return { parseSucceeded: false, parseErrors: ['Unbalanced closing delimiter'] };
    }
  }

  const parseErrors: string[] = [];
  if (braceDepth !== 0) parseErrors.push('Unbalanced braces');
  if (parenDepth !== 0) parseErrors.push('Unbalanced parentheses');
  if (bracketDepth !== 0) parseErrors.push('Unbalanced brackets');
  if (inString) parseErrors.push('Unclosed string literal');
  if (inChar) parseErrors.push('Unclosed char literal');
  if (inTextBlock) parseErrors.push('Unclosed text block literal');
  if (inBlockComment) parseErrors.push('Unclosed block comment');

  return {
    parseSucceeded: parseErrors.length === 0,
    parseErrors
  };
}

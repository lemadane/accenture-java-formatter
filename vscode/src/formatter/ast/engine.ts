import { FormatterConfig } from '../config';
import { LegacyJavaFormatter } from '../legacyFormatter';
import { parseJavaAst } from './parser';
import { JavaAstModel } from './types';

export class AstFormattingEngine {
  private readonly legacyFormatter: LegacyJavaFormatter;
  private lastAstModel: JavaAstModel | undefined;

  constructor(private readonly config: FormatterConfig) {
    this.legacyFormatter = new LegacyJavaFormatter(config);
  }

  public formatDocument(sourceCode: string): string {
    this.lastAstModel = parseJavaAst(sourceCode);

    // Keep formatter output parity while routing all requests through AST parsing.
    return this.legacyFormatter.formatDocument(sourceCode);
  }

  public formatRange(sourceCode: string, startLine: number, endLine: number): string {
    this.lastAstModel = parseJavaAst(sourceCode);

    // Keep formatter output parity while routing all requests through AST parsing.
    return this.legacyFormatter.formatRange(sourceCode, startLine, endLine);
  }

  public getLastAstModel(): JavaAstModel | undefined {
    return this.lastAstModel;
  }
}

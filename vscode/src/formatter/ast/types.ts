export interface AstImportDeclaration {
  isStatic: boolean;
  qualifiedName: string;
  sourceLine: number;
}

export interface JavaAstModel {
  parseSucceeded: boolean;
  parseErrors: string[];
  packageDeclaration?: string;
  importDeclarations: AstImportDeclaration[];
  rawTree?: unknown;
}

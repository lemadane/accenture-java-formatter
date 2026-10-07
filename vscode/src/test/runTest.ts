import * as path from 'path';
import Mocha from 'mocha';

// Register 'vscode' module mock hook AT THE TOP before importing any application files
const Module = require('module');
const originalRequire = Module.prototype.require;

class MockDocument {
    public languageId = 'java';
    public lineCount = 1;
    public uri = { fsPath: '/test/Sample.java' };
    public _text: string;

    constructor(content: string) {
        this._text = content;
        this.lineCount = content.split('\n').length;
    }

    getText(range?: any) {
        return this._text;
    }

    positionAt(offset: number) {
        return { line: 0, character: offset };
    }
}

class MockEditor {
    public document: MockDocument;
    public selection: any;
    public options = { tabSize: 2, insertSpaces: true };

    constructor(doc: MockDocument) {
        this.document = doc;
        this.selection = { isEmpty: false, start: { line: 0, character: 0 }, end: { line: doc.lineCount, character: 0 } };
    }

    async edit(callback: (editBuilder: any) => void) {
        const editBuilder = {
            replace: (_range: any, newText: string) => {
                this.document._text = newText;
                this.document.lineCount = newText.split('\n').length;
            }
        };
        await callback(editBuilder);
        return true;
    }
}

let activeDoc: MockDocument | undefined;
let activeEditor: MockEditor | undefined;

const configStore = new Map<string, any>();

Module.prototype.require = function (request: string) {
    if (request === 'vscode') {
        return {
            workspace: {
                getConfiguration: (section?: string) => ({
                    get: (key: string, defaultValue: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configStore.has(fullKey) ? configStore.get(fullKey) : defaultValue;
                    },
                    update: async (key: string, value: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        configStore.set(fullKey, value);
                    }
                }),
                getWorkspaceFolder: () => undefined,
                openTextDocument: async (options?: any) => {
                    const content = options?.content ?? '';
                    activeDoc = new MockDocument(content);
                    return activeDoc;
                },
                applyEdit: async (edit: any) => {
                    if (activeDoc && edit._changes) {
                        activeDoc._text = edit._changes.text;
                    }
                    return true;
                }
            },
            window: {
                showTextDocument: async (doc: any) => {
                    activeEditor = new MockEditor(doc);
                    return activeEditor;
                },
                get activeTextEditor() {
                    return activeEditor;
                },
                showInformationMessage: () => {},
                showErrorMessage: () => {},
                showWarningMessage: () => {},
                createStatusBarItem: () => ({
                    show: () => {},
                    hide: () => {},
                    text: '',
                    tooltip: '',
                    command: ''
                })
            },
            commands: {
                executeCommand: async (cmd: string) => {
                    const { JavaFormatter } = require('../formatter/javaFormatter');
                    const { ACCENTURE_DEFAULT_CONFIG } = require('../formatter/config');
                    const { organizeJavaImports } = require('../formatter/organizeImports');

                    if (cmd === 'accentureJava.format.setAsDefault') {
                        configStore.set('[java].editor.defaultFormatter', 'accenture.accenture-java-formatter');
                        return;
                    }

                    if (!activeEditor) return;

                    if (cmd === 'accentureJava.format.document') {
                        const formatter = new JavaFormatter(ACCENTURE_DEFAULT_CONFIG);
                        activeEditor.document._text = formatter.formatDocument(activeEditor.document.getText());
                    } else if (cmd === 'accentureJava.format.organizeImports') {
                        const lines = activeEditor.document.getText().split('\n');
                        const res = organizeJavaImports(lines);
                        if (res.hasImports) {
                            const before = lines.slice(0, res.startLineIndex).join('\n');
                            const after = lines.slice(res.endLineIndex + 1).join('\n');
                            activeEditor.document._text = [before, res.importsText, after].filter(s => s).join('\n');
                        }
                    } else if (cmd === 'accentureJava.format.selection') {
                        const formatter = new JavaFormatter(ACCENTURE_DEFAULT_CONFIG);
                        activeEditor.document._text = formatter.formatRange(
                            activeEditor.document.getText(),
                            activeEditor.selection.start.line,
                            activeEditor.selection.end.line
                        );
                    } else if (cmd === 'workbench.action.closeActiveEditor') {
                        activeEditor = undefined;
                        activeDoc = undefined;
                    }
                }
            },
            Position: class {
                constructor(public line: number, public character: number) {}
            },
            Range: class {
                constructor(public start: any, public end: any, public endLine?: number, public endChar?: number) {}
            },
            Selection: class {
                constructor(public start: any, public end: any) {}
            },
            WorkspaceEdit: class {
                public _changes: any;
                replace(uri: any, range: any, newText: string) {
                    this._changes = { uri, range, text: newText };
                }
                set(uri: any, edits: any[]) {
                    if (edits && edits.length > 0) {
                        this._changes = { uri, text: edits[0].newText };
                    }
                }
            },
            TextEdit: {
                replace: (range: any, newText: string) => ({ range, newText })
            },
            CodeAction: class {},
            CodeActionKind: { SourceOrganizeImports: 'SourceOrganizeImports', SourceFixAll: 'SourceFixAll' },
            StatusBarAlignment: { Right: 1, Left: 2 },
            CancellationTokenSource: class {
                token = {};
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, 'suite');

    return new Promise((resolve, reject) => {
        fs_readdir_sync_recursive(testsRoot);

        function fs_readdir_sync_recursive(dir: string) {
            const fs = require('fs');
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    fs_readdir_sync_recursive(fullPath);
                } else if (file.endsWith('.test.js')) {
                    mocha.addFile(fullPath);
                }
            }
        }

        try {
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}

if (require.main === module) {
    run().then(() => {
        console.log('All E2E & Unit tests passed successfully.');
        process.exit(0);
    }).catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

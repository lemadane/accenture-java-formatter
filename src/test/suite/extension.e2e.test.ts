import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Accenture Java Formatter E2E Test Suite (Rules 1-10)', () => {

    let testDoc: vscode.TextDocument;
    let testEditor: vscode.TextEditor;

    beforeEach(async () => {
        testDoc = await vscode.workspace.openTextDocument({
            language: 'java',
            content: ''
        });
        testEditor = await vscode.window.showTextDocument(testDoc);
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    it('E2E Rule 1: Any annotation should sit on its own dedicated line', async () => {
        const inputCode = [
            'package com.accenture.test;',
            '@Entity @Table(name = "users")',
            'public class User {',
            '  @Autowired @Qualifier("service") private PaymentService service;',
            '  @Override public void execute() {}',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('@Entity\n@Table(name = "users")\npublic class User'));
        assert.ok(text.includes('  @Autowired\n  @Qualifier("service")\n  private PaymentService service;'));
        assert.ok(text.includes('  @Override\n  public void execute() {}'));
    });

    it('E2E Bug Fix: Preserve method header prefix when annotations are present inside parameter list', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            '@PostMapping',
            '@Validated',
            'public ResponseEntity<ProductResponse> create(@RequestBody @Validated final CreateProductRequest request) {',
            '  final var product = this.productService.create(',
            '      request);',
            '  final var location = URI.create(',
            '      "/api/products/" + product.id());',
            '  return ResponseEntity',
            '      .created(location)',
            '      .body(product);',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('public ResponseEntity<ProductResponse> create('), 'Method header prefix public ResponseEntity... create( MUST be preserved and not deleted');
        assert.ok(text.includes('@RequestBody'), 'Annotation @RequestBody must be on dedicated line');
        assert.ok(text.includes('@Validated'), 'Annotation @Validated must be on dedicated line');

        assert.ok(text.includes('CreateProductRequest request) {'), 'Parameter declaration must be preserved');


    });

    it('E2E Rule 4: Method and constructor declarations with >1 argument must be on next line per argument', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class Calculator {',
            '  public int add(int a, int b) {',
            '    return a + b;',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('public int add('));
        assert.ok(text.includes('    int a,'));
        assert.ok(text.includes('    int b) {'));
    });

    it('E2E Rule 5: extends, implements, throws must be on the next line together with associated class/interface/exception', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class CustomController extends BaseController implements ControllerInterface throws Exception {',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('public class CustomController\n    extends BaseController\n    implements ControllerInterface\n    throws Exception {'));
    });

    it('E2E Rule 6: Method calls under implementation with >1 argument should be on next line per argument', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class PaymentController {',
            '  private PaymentService service;',
            '  public void execute(String id, Double amount) {',
            '    service.pay(id, amount);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('service.pay('));
        assert.ok(text.includes('id,'));
        assert.ok(text.includes('amount);'));
    });

    it('E2E Rule 7: Assignment statement RHS is indented 2x when on next line, but not forced onto next line if under 80 chars', async () => {
        // Case A: Multiline assignment split by user (as in screenshot) must be 2x indented
        const multilineInput = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  @PostMapping',
            '  public ResponseEntity<ProductResponse> create(',
            '      @RequestBody',
            '      CreateProductRequest request) {',
            '    final var product =',
            '    this.productService.create(request);',
            '    final var location =',
            '    URI.create(',
            '        "/api/products/" + product.id());',
            '    return ResponseEntity',
            '        .created(location)',
            '        .body(product);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, multilineInput);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var product =\n        this.productService.create(request);'), 'RHS on next line must be 2x indented (8 spaces)');
        assert.ok(text.includes('    final var location =\n        URI.create('), 'RHS URI.create on next line must be 2x indented');

        // Case B: Single line assignment under 80 chars must NOT be forced onto next line
        const singleLineInput = [
            'package com.accenture.test;',
            'public class Config {',
            '  public void setup() {',
            '    String shortName = "Accenture";',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, singleLineInput);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const textSingle = testDoc.getText();

        assert.ok(textSingle.includes('    String shortName = "Accenture";'), 'Single line assignment under 80 chars must not be forced onto next line');
    });

    it('E2E Normal Formatting: Normalize missing assignment spaces and excessive parenthesis spaces', async () => {
        const messyCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  public Object create() {',
            '    final var product = this.productService.create(request);',
            '    final var location=URI.create(       "/api/products/" + product.id());',
            '    return ResponseEntity.ok(location);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, messyCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var product = this.productService.create(request);'), 'Single line assignment under 80 chars must stay on single line');
        assert.ok(text.includes('    final var location = URI.create("/api/products/" + product.id());'), 'Missing spaces around = and excess paren spaces must be normalized');
    });

    it('E2E Rule 8: On chaining objects, if >=2 chained objects, break each chained call starting from 2nd dot onto next line including dot', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class ResponseHandler {',
            '  public ResponseEntity<String> getResponse() {',
            '    return ResponseEntity.ok().body("Success");',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('return ResponseEntity.ok()\n        .body("Success");'));
    });

    it('E2E Rule 9: Statements reaching 80 column or more wrap assignment RHS or method arguments onto next line', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class OrderService {',
            '  public void processOrder() {',
            '    String orderDescriptionMessageHeader = "Order successfully created for customer identifier";',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('String orderDescriptionMessageHeader ='));
    });

    it('E2E Rule 8 & Argument Indentation: Multiline arguments inside .map and .orElseGet chained calls must be 2x indented', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  public Object getProduct(final UUID id) {',
            '    return this.productService.getById(id)',
            '      .map(',
            '  ResponseEntity::ok)',
            '      .orElseGet(',
            '  () -> ResponseEntity.notFound()',
            '      .build());',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('        .map('));
        assert.ok(text.includes('        ResponseEntity::ok)'));
        assert.ok(text.includes('        .orElseGet('));
        assert.ok(text.includes('        () -> ResponseEntity.notFound()'));

    });

    it('E2E Indentation Rules: 2-space base block indentation and 2x continuation indentation for multiline assignment RHS', async () => {
        const inputCode = [
            'package com.accenture.indentation;',
            'public class IndentationDemo {',
            '  public void process() {',
            '    final var product =',
            '    this.productService.create(request);',
            '    final var location = URI.create("/api/products/" + product.id());',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        // 1. Level 1 (Class Body) = 2 spaces
        assert.ok(text.includes('\npublic class IndentationDemo {\n'), 'Class declaration must be at level 0 (0 spaces)');
        assert.ok(text.includes('\n  public void process() {\n'), 'Method header must be at level 1 (2 spaces)');

        // 2. Level 2 (Method Body) = 4 spaces for assignment statement header
        assert.ok(text.includes('\n    final var product =\n'), 'Assignment start line in method body must be at level 2 (4 spaces)');

        // 3. Level 2 + 2x continuation (+4 spaces) = 8 spaces for RHS on next line
        assert.ok(text.includes('\n        this.productService.create(request);\n'), 'Multiline assignment RHS on next line must have 2x continuation indentation (8 spaces total)');

        // 4. Single-line assignment under 80 chars retains level 2 (4 spaces)
        assert.ok(text.includes('\n    final var location = URI.create("/api/products/" + product.id());\n'), 'Single line assignment under 80 chars stays on single line with 4 spaces');
    });

    it('E2E Rule 10: Automatic formatting is triggered on document save', async () => {
        const unformattedCode = [
            'package com.accenture.test;',
            'public class SaveTest{',
            'public void run(){',
            'System.out.println("Save Test");',
            '}',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, unformattedCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('public class SaveTest {'));
        assert.ok(text.includes('  public void run() {'));
    });

});


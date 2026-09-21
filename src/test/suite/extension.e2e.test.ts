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

    it('E2E Rule 2: All fields must include this. prefix on implementations throughout class code, protecting parameters', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  private ProductService productService;',
            '  @PostMapping',
            '  public ResponseEntity<ProductResponse> create(@RequestBody CreateProductRequest request) {',
            '    final var product = productService.create(request);',
            '    return ResponseEntity.ok(product);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(!text.includes('this.request'), 'Method parameter request must NOT receive this. prefix');
        assert.ok(text.includes('this.productService.create(request);'), 'Class field productService must receive this. prefix');
    });

    it('E2E Rule 3: Method and constructor declarations arguments must include final keyword', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class PaymentService {',
            '  public void processPayment(String id, Double amount) {',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('final String id'));
        assert.ok(text.includes('final Double amount'));
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
        assert.ok(text.includes('    final int a,'));
        assert.ok(text.includes('    final int b) {'));
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
            '  public void execute(final String id, final Double amount) {',
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

        assert.ok(text.includes('this.service.pay('));
        assert.ok(text.includes('id,'));
        assert.ok(text.includes('amount);'));
    });

    it('E2E Rule 7: On assignment statements, right hand side of = can be on next line indented 2x', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class Config {',
            '  public void setup() {',
            '    String name = "Accenture Enterprise Java Application Config";',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('String name =\n        "Accenture Enterprise Java Application Config";'));
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

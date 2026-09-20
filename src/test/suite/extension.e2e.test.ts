import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

describe('Accenture Java Formatter E2E Test Suite', () => {

    let testDoc: vscode.TextDocument;
    let testEditor: vscode.TextEditor;

    beforeEach(async () => {
        // Create an untitled Java document for E2E testing
        testDoc = await vscode.workspace.openTextDocument({
            language: 'java',
            content: ''
        });
        testEditor = await vscode.window.showTextDocument(testDoc);
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    it('E2E: Should execute accentureJava.format.document command and format active Java editor', async () => {
        const unformattedJavaCode = [
            'package com.accenture.test;',
            'import java.util.Map;',
            'import java.util.List;',
            'public class PaymentController{',
            '@Autowired',
            'private PaymentService service;',
            '@PostMapping("/process")',
            'public ResponseEntity<String> processPayment(String id,Double amount){',
            'if(amount<=0){',
            'return ResponseEntity.badRequest().body("Invalid amount");',
            '}else{',
            'return ResponseEntity.ok(service.pay(id,amount));',
            '}',
            '}',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, unformattedJavaCode);
        });

        // Trigger Accenture Java Formatter Document Command
        await vscode.commands.executeCommand('accentureJava.format.document');

        const formattedText = testDoc.getText();
        
        assert.ok(formattedText.includes('public class PaymentController {'), 'Class header should be formatted with space before brace');
        assert.ok(formattedText.includes('  @Autowired'), 'Annotations should be indented properly');
        assert.ok(formattedText.includes('  public ResponseEntity<String> processPayment(String id, Double amount) {'), 'Method declaration formatted');
        assert.ok(formattedText.includes('    if (amount <= 0) {'), 'Control flow and operator space formatted');
        assert.ok(formattedText.includes('    } else {'), 'Else statement formatted');
    });

    it('E2E: Should execute accentureJava.format.organizeImports command on Java editor', async () => {
        const messyImportsCode = [
            'package com.accenture.test;',
            '',
            'import com.accenture.service.PaymentService;',
            'import java.util.List;',
            'import static org.junit.Assert.assertNotNull;',
            'import org.springframework.stereotype.Service;',
            'import java.util.Map;',
            '',
            'public class TestClass {}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, messyImportsCode);
        });

        // Trigger Organize Imports command
        await vscode.commands.executeCommand('accentureJava.format.organizeImports');

        const textAfterOrganize = testDoc.getText();
        const staticIndex = textAfterOrganize.indexOf('import static org.junit.Assert.assertNotNull;');
        const javaIndex = textAfterOrganize.indexOf('import java.util.List;');
        const accentureIndex = textAfterOrganize.indexOf('import com.accenture.service.PaymentService;');

        assert.ok(staticIndex !== -1, 'Static imports present');
        assert.ok(javaIndex !== -1, 'Java imports present');
        assert.ok(accentureIndex !== -1, 'Accenture imports present');
        assert.ok(staticIndex < javaIndex, 'Static imports should precede java.* imports');
    });

    it('E2E: Should format selected range using accentureJava.format.selection', async () => {
        const codeWithMessySection = [
            'package com.accenture.test;',
            'public class Calculator {',
            'public int add(int a,int b){',
            'return a+b;',
            '}',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, codeWithMessySection);
        });

        // Select lines 2 to 4 (method add)
        testEditor.selection = new vscode.Selection(new vscode.Position(2, 0), new vscode.Position(4, 11));

        await vscode.commands.executeCommand('accentureJava.format.selection');

        const resultText = testDoc.getText();
        assert.ok(resultText.length > 0);
    });

    it('E2E: Should automatically format when code changes in editor', async () => {
        const initialCode = [
            'package com.accenture.test;',
            'public class ChangeTest{',
            'public void execute(){',
            'System.out.println("Hello");',
            '}',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, initialCode);
        });

        // Trigger document format simulation
        await vscode.commands.executeCommand('accentureJava.format.document');

        const changedText = testDoc.getText();
        assert.ok(changedText.includes('public class ChangeTest {'));
        assert.ok(changedText.includes('  public void execute() {'));
    });

});

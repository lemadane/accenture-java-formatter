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

    it('E2E Rule 9 (Default 70): Single-line assignment between 70-79 chars must wrap RHS onto next line', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class LineLength70Rule {',
            '  public void run() {',
            '    String msg = "Order created for customer account reference and branch code";',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    String msg =\n' +
                '        "Order created for customer account reference and branch code";'
            ),
            'Default 70-column rule must wrap assignment RHS onto next line for a statement between 70 and 79 chars'
        );
    });

    it('E2E Rule 7: Assignment statement RHS is indented 2x when on next line, but not forced onto next line if under 70 chars', async () => {
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

        // Case B: Single line assignment under 70 chars must NOT be forced onto next line
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

        assert.ok(textSingle.includes('    String shortName = "Accenture";'), 'Single line assignment under 70 chars must not be forced onto next line');
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

        assert.ok(text.includes('    final var product = this.productService.create(request);'), 'Single line assignment under 70 chars must stay on single line');
        assert.ok(
            text.includes('    final var location =\n        URI.create("/api/products/" + product.id());'),
            'Missing spaces around = and excess paren spaces must be normalized, and long assignment must wrap at 70 columns'
        );
    });

    it('E2E URI.create multiline argument: + product.id() should be 2 levels deeper than previous string line', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  public Object create() {',
            '    final var location = URI.create(',
            '        "/api/products/"',
            '        + product.id());',
            '    return ResponseEntity.ok(location);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    final var location = URI.create(\n' +
                '        "/api/products/"\n' +
                '            + product.id());'
            ),
            'Expected + product.id()); to be indented 2 levels (4 spaces) beyond the previous continuation line'
        );
    });

    it('E2E URI.create controller case: + line is indented 4 spaces relative to string line', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  @PostMapping',
            '  public ResponseEntity<ProductResponse> create(',
            '      @RequestBody',
            '      @Validated',
            '      CreateProductRequest request) {',
            '    final var product = productService.create(request);',
            '    final var location = URI.create(',
            '        "/api/products/"',
            '        + product.id());',
            '    return ResponseEntity',
            '        .created(location)',
            '        .body(product);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    final var location = URI.create(\n' +
                '        "/api/products/"\n' +
                '            + product.id());'
            ),
            'Expected + product.id()); to be exactly 4 spaces deeper than the previous string line'
        );
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

    it('E2E Rule 9: Statements reaching 70 column or more wrap assignment RHS or method arguments onto next line', async () => {
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
        assert.ok(text.includes('            .build());'));
    });

    it('E2E 2-State Testing (State 1): .notFound() and .build() indented 2x (12 spaces) below .orElseGet(() -> ResponseEntity', async () => {
        const state1Input = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  @GetMapping("/{id}")',
            '  public ResponseEntity<ProductResponse> getById(@PathVariable final UUID id) {',
            '    return this.productService.getById(id)',
            '        .map(ResponseEntity::ok)',
            '        .orElseGet(() -> ResponseEntity',
            '            .notFound()',
            '            .build());',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, state1Input);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '        .orElseGet(() -> ResponseEntity\n' +
                '            .notFound()\n' +
                '            .build());'
            ),
            'State 1: .notFound() and .build() must both be indented 2x (12 spaces) relative to .orElseGet(() -> ResponseEntity (8 spaces)'
        );
    });

    it('E2E 2-State Testing (State 2): () -> ResponseEntity on new line (12 spaces) and .notFound()/.build() indented 2x (16 spaces) below it', async () => {
        const state2Input = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  @GetMapping("/{id}")',
            '  public ResponseEntity<ProductResponse> getById(@PathVariable final UUID id) {',
            '    return this.productService.getById(id)',
            '        .map(ResponseEntity::ok)',
            '        .orElseGet(',
            '            () -> ResponseEntity',
            '                .notFound()',
            '                .build());',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, state2Input);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '        .orElseGet(\n' +
                '            () -> ResponseEntity\n' +
                '                .notFound()\n' +
                '                .build());'
            ),
            'State 2: () -> ResponseEntity must be at 12 spaces and .notFound()/.build() must both be 2x indented (16 spaces) below it'
        );
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

        // 4. Single-line assignment under 70 chars retains level 2 (4 spaces)
        assert.ok(text.includes('\n    final var location = URI.create("/api/products/" + product.id());\n'), 'Single line assignment under 70 chars stays on single line with 4 spaces');
    });

    it('E2E Assignment Bug 1: Missing space after equal sign must be normalized', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class TestClass {',
            '  public void test() {',
            '    final var product =productService.create(request);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var product = productService.create(request);'), 'Missing space after = must be normalized to = ');
    });

    it('E2E Assignment Bug 2: Missing space before equal sign must be normalized', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class TestClass {',
            '  public void test() {',
            '    final var location= URI.create("/api/products");',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var location = URI.create("/api/products");'), 'Missing space before = must be normalized to = ');
    });

    it('E2E Assignment Bug 3: Equal sign and RHS starting on next line must be 2x indented (4 spaces)', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class TestClass {',
            '  public void test() {',
            '    final var product',
            '= productService.create(',
            '        request);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var product\n        = productService.create('), 'Equal sign and RHS starting on next line must be 2x indented (8 spaces total)');
    });

    it('E2E Assignment Bug 4: Equal sign at end of line 1 with RHS on line 2 must be preserved with 2x indentation', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class TestClass {',
            '  public void test() {',
            '    final var product =',
            '        productService.create(',
            '            request);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    final var product =\n        productService.create(\n            request);'), 'Equal sign on line 1 with RHS on line 2 must be preserved with 2x indentation');
    });

    it('E2E SQL String Bug: SQL queries containing equal sign must not be treated as Java assignment statements', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class SqlQueryTest {',
            '  public void executeQuery() {',
            '    String sql = "select * from table a where size = 10 limit 5";',
            '    jdbcTemplate.query("select * from table a where size = 10 limit 5", rowMapper);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('    String sql = "select * from table a where size = 10 limit 5";'), 'SQL string literal in assignment must not be broken up at inner equal sign');
        assert.ok(text.includes('        "select * from table a where size = 10 limit 5",'), 'SQL string inside method call must remain complete and unbroken');
    });

    it('E2E Annotation Arguments: Annotations with >1 arguments must format multiline (1 per line)', async () => {
        const inputCode = [
            'package com.accenture.test;',
            '@Table(name = "users", schema = "public")',
            'public class User {',
            '  @Column(name = "id", nullable = false, unique = true)',
            '  private Long id;',
            '  @Table(name = "single_arg")',
            '  private String name;',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('@Table(\n    name = "users",\n    schema = "public")'), 'Annotation with 2 arguments must be formatted multiline');
        assert.ok(text.includes('  @Column(\n      name = "id",\n      nullable = false,\n      unique = true)'), 'Field annotation with 3 arguments must be formatted multiline');
        assert.ok(text.includes('  @Table(name = "single_arg")'), 'Annotation with 1 argument must remain on single line');
    });

    it('E2E Method Argument String Bug: System.out.println with equal sign in string argument reaching 70 chars wraps argument onto next line', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class PrintlnTest {',
            '  public void printLog(UUID id) {',
            '    System.out.println("Hello! This is before formatting = with formatted id: " + id);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes('    System.out.println(\n        "Hello! This is before formatting = with formatted id: " + id);'),
            'System.out.println reaching 70 chars must wrap method argument onto next line (8 spaces)'
        );
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

    it('E2E Rule 4/9: Method declaration with 1 single parameter exceeding 70 columns must wrap parameter onto next line', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ExceptionHandlerController {',
            '  @ExceptionHandler(MethodArgumentNotValidException.class)',
            '  public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(final MethodArgumentNotValidException exception) {',
            '    return null;',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '  public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(\n' +
                '      final MethodArgumentNotValidException exception) {'
            ),
            'Long single parameter method header must wrap parameter onto next line with +4 space continuation indent'
        );
    });

    it('E2E Ternary Operators: Long ternary statements must split into 3 clean lines at ? and : without breaking chained methods inside branches', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  public void update(Request request, Product existingProduct) {',
            '    final String name = request.name()                !=        null ? request.name() : existingProduct.name();',
            '    final String description = request.description() != null ? request.description() : existingProduct.description();',
            '    final java.math.BigDecimal price = request.price() != null ? request.price() : existingProduct.price();',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    final String name = request.name() != null\n' +
                '        ? request.name()\n' +
                '        : existingProduct.name();'
            ),
            'Ternary statement for name must format cleanly into 3 lines'
        );
        assert.ok(
            text.includes(
                '    final String description = request.description() != null\n' +
                '        ? request.description()\n' +
                '        : existingProduct.description();'
            ),
            'Ternary statement for description must format cleanly into 3 lines'
        );
        assert.ok(
            text.includes(
                '    final java.math.BigDecimal price = request.price() != null\n' +
                '        ? request.price()\n' +
                '        : existingProduct.price();'
            ),
            'Ternary statement for price must format cleanly into 3 lines'
        );
    });

    it('E2E Ternary Operators: Broken multiline ternary statements from editor must be re-joined and formatted into 3 clean lines', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            'public class ProductController {',
            '  public void update(Request request, Product existingProduct) {',
            '    final String name =',
            '        request.name() != null ? request',
            '        .name() : existingProduct',
            '        .name();',
            '    final String description =',
            '        request.description(',
            '    ) != null ? request.description() : existingProduct',
            '        .description();',
            '    final java.math.BigDecimal price =',
            '        request.price() != null ? request',
            '        .price() : existingProduct',
            '        .price();',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    final String name = request.name() != null\n' +
                '        ? request.name()\n' +
                '        : existingProduct.name();'
            ),
            'Broken multiline ternary statement for name must be re-joined and formatted into 3 clean lines'
        );
        assert.ok(
            text.includes(
                '    final String description = request.description() != null\n' +
                '        ? request.description()\n' +
                '        : existingProduct.description();'
            ),
            'Broken multiline ternary statement for description must be re-joined and formatted into 3 clean lines'
        );
        assert.ok(
            text.includes(
                '    final java.math.BigDecimal price = request.price() != null\n' +
                '        ? request.price()\n' +
                '        : existingProduct.price();'
            ),
            'Broken multiline ternary statement for price must be re-joined and formatted into 3 clean lines'
        );
    });

    it('E2E Idempotency: Formatting twice (2x) must produce the exact same clean code as formatting once (1x) for long annotations', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            '@RequestMapping("/api/products/api/products/api/products/api/products/api/products")',
            'public record ProductController() {}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        // Format Pass 1
        await vscode.commands.executeCommand('accentureJava.format.document');
        const firstPassText = testDoc.getText();

        // Format Pass 2
        await vscode.commands.executeCommand('accentureJava.format.document');
        const secondPassText = testDoc.getText();

        assert.strictEqual(
            secondPassText,
            firstPassText,
            'Formatting 2x must be idempotent and produce identical text to formatting 1x'
        );
        assert.ok(
            !secondPassText.includes('@RequestMapping\n('),
            '@RequestMapping and ( must never be separated onto different lines'
        );
    });

    it('E2E Rule 1/9: Annotation with long single argument exceeding 70 columns wraps argument onto next line idempotently', async () => {
        const inputCode = [
            'package com.accenture.controller;',
            '@RequestMapping("/api/products/api/products/api/products/api/products/api/products")',
            'public record ProductController() {}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        // Format Pass 1
        await vscode.commands.executeCommand('accentureJava.format.document');
        const firstPassText = testDoc.getText();

        const expectedText = [
            'package com.accenture.controller;',
            '@RequestMapping(',
            '    "/api/products/api/products/api/products/api/products/api/products")',
            'public record ProductController() {}'
        ].join('\n');

        assert.strictEqual(
            firstPassText,
            expectedText,
            'Long annotation argument reaching 70 chars must wrap argument onto next line starting with @Annotation('
        );

        // Format Pass 2 (Idempotency Check)
        await vscode.commands.executeCommand('accentureJava.format.document');
        const secondPassText = testDoc.getText();

        assert.strictEqual(
            secondPassText,
            firstPassText,
            'Formatting 2x must be idempotent and preserve @Annotation( on Line 1'
        );
    });

    it('E2E Text Blocks: Content of Java 15+ multiline text blocks ("""...""") must be treated strictly as literal text', async () => {
        const inputCode = [
            'package com.accenture.service;',
            'public class SqlService {',
            '  public String getQuery() {',
            '    String sql = """',
            '        SELECT u.id, u.name, u.email',
            '        FROM users u',
            '        WHERE u.status = \'ACTIVE\' AND u.age >= 18',
            '        ORDER BY u.created_at DESC;',
            '        """;',
            '    return sql;',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('WHERE u.status = \'ACTIVE\' AND u.age >= 18'), 'Text block contents must be preserved as literal text');
        assert.ok(text.includes('ORDER BY u.created_at DESC;'), 'SQL text block statements must not be formatted as code');
    });

    it('E2E String Literals: Content of single-line strings ("") containing Java syntax operators and keywords must remain untouched', async () => {
        const inputCode = [
            'package com.accenture.service;',
            'public class StringTest {',
            '  public void printCode() {',
            '    String codeSnippet = "if (a == b) { return a ? b : c; } extends BaseClass";',
            '    System.out.println(codeSnippet);',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(text.includes('"if (a == b) { return a ? b : c; } extends BaseClass"'), 'String literal content must remain untouched as literal text');
    });

    it('E2E Multiline Ternary Alignment: Ternary assignments with internal blank lines and assignment RHS split format cleanly without stray empty lines', async () => {
        const inputCode = [
            'package com.accenture.test;',
            'public class TernaryTest {',
            '  public void execute(Request request, Product existingProduct) {',
            '    final String name',
            '        = (request.name() != null)',
            '',
            '        ? request.name()',
            '        : existingProduct.name();',
            '    final String descriptionaaaaaaaaaaaaaaaaaaaaaaaaaaaa =',
            '        request.description() != null',
            '        ? request.description()',
            '        : existingProduct.description();',
            '  }',
            '}'
        ].join('\n');

        await testEditor.edit(editBuilder => {
            const fullRange = new vscode.Range(0, 0, testDoc.lineCount, 0);
            editBuilder.replace(fullRange, inputCode);
        });

        await vscode.commands.executeCommand('accentureJava.format.document');
        const text = testDoc.getText();

        assert.ok(
            text.includes(
                '    final String name =\n' +
                '        (request.name() != null)\n' +
                '        ? request.name()\n' +
                '        : existingProduct.name();'
            ) ||
            text.includes(
                '    final String name\n' +
                '        = (request.name() != null)\n' +
                '        ? request.name()\n' +
                '        : existingProduct.name();'
            ),
            'Ternary assignment must format into contiguous lines without empty lines before ?'
        );
        assert.ok(
            text.includes(
                '    final String descriptionaaaaaaaaaaaaaaaaaaaaaaaaaaaa =\n' +
                '        request.description() != null\n' +
                '        ? request.description()\n' +
                '        : existingProduct.description();'
            ),
            'Long assignment RHS ternary must align 4-space indented lines 2, 3, and 4 without blank lines'
        );
    });

});







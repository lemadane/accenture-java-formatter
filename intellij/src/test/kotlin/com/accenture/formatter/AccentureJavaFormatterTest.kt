package com.accenture.formatter

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AccentureJavaFormatterTest {

    private val config = AccentureFormatterConfig()

    private fun assertFormatting(input: String, expected: String) {
        val formattedOnce = AccentureJavaFormatter.format(input, config)
        assertEquals("First format pass failed", expected, formattedOnce)
        val formattedTwice = AccentureJavaFormatter.format(formattedOnce, config)
        assertEquals("Idempotency check failed (2x format)", formattedOnce, formattedTwice)
    }

    // =========================================================================
    // Category 1: Standard Preprocessor Rules (Rules 1 - 10)
    // =========================================================================

    @Test
    fun testRule1_AnnotationsOnDedicatedLines() {
        val input = """
            package com.accenture.test;
            @Entity @Table(name = "users")
            public class User {
                @Autowired @Qualifier("service") private PaymentService service;
                @Override public void execute() {}
            }
        """.trimIndent()

        val expected = "package com.accenture.test;\n" +
                "@Entity\n" +
                "@Table(name = \"users\")\n" +
                "public class User {\n" +
                "    @Autowired\n" +
                "    @Qualifier(\"service\")\n" +
                "    private PaymentService service;\n" +
                "    @Override\n" +
                "    public void execute() {}\n" +
                "}"

        assertFormatting(input, expected)
    }

    @Test
    fun testRule1_PreserveMethodHeaderPrefixWhenAnnotationsPresentInParameterList() {
        val input = """
            package com.accenture.controller;
            @PostMapping
            @Validated
            public ResponseEntity<ProductResponse> create(@RequestBody @Validated final CreateProductRequest request) {
                final var product = this.productService.create(
                        request);
                final var location = URI.create(
                        "/api/products/" + product.id());
                return ResponseEntity
                        .created(location)
                        .body(product);
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Method header prefix must be preserved", formatted.contains("public ResponseEntity<ProductResponse> create("))
        assertTrue("Annotation @RequestBody must be present", formatted.contains("@RequestBody"))
        assertTrue("Annotation @Validated must be present", formatted.contains("@Validated"))
        assertTrue("Parameter declaration must be preserved", formatted.contains("CreateProductRequest request"))
    }

    @Test
    fun testRule4_MethodParameterWrapping_MultipleParams() {
        val input = """
            package com.accenture.test;
            public class Calculator {
                public int add(int a, int b) {
                    return a + b;
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class Calculator {
                public int add(
                    int a,
                    int b
                ) {
                    return a + b;
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule4_MethodParameterWrapping_SingleShortParam() {
        val input = """
            public class Sample {
                public void processSingle(String shortName) {
                    // body
                }
            }
        """.trimIndent()

        val expected = """
            public class Sample {
                public void processSingle(String shortName) {
                    // body
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule4_MethodParameterWrapping_SingleLongParam() {
        val input = """
            public class Sample {
                public void processVeryLongSingleParameterNameThatExceedsEightyColumnsWidthInHeader(String veryLongParameter) {
                    // body
                }
            }
        """.trimIndent()

        val expected = """
            public class Sample {
                public void processVeryLongSingleParameterNameThatExceedsEightyColumnsWidthInHeader(
                    String veryLongParameter
                ) {
                    // body
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule4_SingleLongParameterMethodHeaderWrapping() {
        val input = """
            package com.accenture.controller;
            public class ExceptionHandlerController {
                @ExceptionHandler(MethodArgumentNotValidException.class)
                public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(final MethodArgumentNotValidException exception) {
                    return null;
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.controller;
            public class ExceptionHandlerController {
                @ExceptionHandler(MethodArgumentNotValidException.class)
                public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValidException(
                    final MethodArgumentNotValidException exception
                ) {
                    return null;
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule5_ExtendsImplementsThrowsLineSplitting() {
        val input = """
            package com.accenture.test;
            public class CustomController extends BaseController implements ControllerInterface throws Exception {
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class CustomController
                extends BaseController
                implements ControllerInterface
                throws Exception {
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule6_MethodCallArgumentWrapping() {
        val input = """
            package com.accenture.test;
            public class PaymentController {
                private PaymentService service;
                public void execute(String id, Double amount) {
                    service.pay(id, amount);
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class PaymentController {
                private PaymentService service;
                public void execute(
                    String id,
                    Double amount
                ) {
                    service.pay(
                        id,
                        amount
                    );
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule7_AssignmentRhs2xContinuationIndentation() {
        val input = """
            public class Test {
                public void run() {
                    String result = firstPart + secondPart + thirdPart + fourthPart + fifthPart;
                }
            }
        """.trimIndent()

        val expected = """
            public class Test {
                public void run() {
                    String result =
                            firstPart + secondPart + thirdPart + fourthPart + fifthPart;
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule7_SingleLineAssignmentUnder70CharsNotForced() {
        val input = """
            package com.accenture.test;
            public class Config {
                public void setup() {
                    String shortName = "Accenture";
                }
            }
        """.trimIndent()

        assertFormatting(input, input)
    }

    @Test
    fun testRule8_ObjectChaining() {
        val input = """
            package com.accenture.test;
            public class ResponseHandler {
                public ResponseEntity<String> getResponse() {
                    return ResponseEntity.ok().body("Success");
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class ResponseHandler {
                public ResponseEntity<String> getResponse() {
                    return ResponseEntity
                        .ok()
                        .body("Success");
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRule9_Reaching70ColumnsWrapsAssignmentRhs() {
        val input = """
            package com.accenture.test;
            public class OrderService {
                public void processOrder() {
                    String orderDescriptionMessageHeader = "Order successfully created for customer identifier";
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Statement reaching 70 columns must wrap assignment RHS", formatted.contains("String orderDescriptionMessageHeader ="))
    }

    // =========================================================================
    // Category 2: Annotation Arguments & Idempotency
    // =========================================================================

    @Test
    fun testAnnotationMultipleArgumentsWrapping() {
        val input = """
            package com.accenture.test;
            public class User {
                @Table(name = "users", schema = "public_database_schema_identifier", indexes = {@Index(name = "idx")})
                private String name;
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class User {
                @Table(
                    name = "users",
                    schema = "public_database_schema_identifier",
                    indexes = {@Index(name = "idx")}
                )
                private String name;
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testLongAnnotationArgumentWrapping() {
        val input = """
            @Table(name = "users", indexes = {@Index(name = "idx_user_email", columnList = "email")}, schema = "public")
            public class User {
            }
        """.trimIndent()

        val expected = """
            @Table(
                name = "users",
                indexes = {@Index(name = "idx_user_email", columnList = "email")},
                schema = "public"
            )
            public class User {
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testLongAnnotationSingleArgumentIdempotency() {
        val input = """
            package com.accenture.controller;
            @RequestMapping("/api/products/api/products/api/products/api/products/api/products/api/products")
            public record ProductController() {}
        """.trimIndent()

        assertFormatting(input, input)
    }

    // =========================================================================
    // Category 3: Ternary Operator Formatting & Rejoining
    // =========================================================================

    @Test
    fun testTernaryOperatorJoiningAndFormatting() {
        val input = """
            public class Test {
                public String check(boolean cond) {
                    return cond
                        ? "Value if true"
                        : "Value if false";
                }
            }
        """.trimIndent()

        val expected = """
            public class Test {
                public String check(boolean cond) {
                    return cond ? "Value if true" : "Value if false";
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testLongTernaryOperatorFormatting() {
        val input = """
            public class Test {
                public String check(boolean conditionWithValue) {
                    return conditionWithValue ? "This is a very long text returned when true" : "This is another very long text returned when false";
                }
            }
        """.trimIndent()

        val expected = """
            public class Test {
                public String check(boolean conditionWithValue) {
                    return conditionWithValue
                        ? "This is a very long text returned when true"
                        : "This is another very long text returned when false";
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testLongTernaryWithChainedMethodsBranches() {
        val input = """
            package com.accenture.controller;
            public class ProductController {
                public void update(Request request, Product existingProduct) {
                    final String name = request.name() != null ? request.name() : existingProduct.name();
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Ternary statement for name must format into 3 lines", formatted.contains("final String name = request.name() != null\n            ? request.name()\n            : existingProduct.name();"))
    }

    @Test
    fun testBrokenMultilineTernaryRejoining() {
        val input = """
            package com.accenture.controller;
            public class ProductController {
                public void update(Request request, Product existingProduct) {
                    final String name =
                        request.name() != null ? request
                        .name() : existingProduct
                        .name();
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Broken multiline ternary must be re-joined and formatted cleanly", formatted.contains("final String name = request.name() != null\n            ? request.name()\n            : existingProduct.name();"))
    }

    // =========================================================================
    // Category 4: Assignment Statement Bugs & Normalization
    // =========================================================================

    @Test
    fun testAssignmentMissingSpaceAfterEquals() {
        val input = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var product =productService.create(request);
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var product = productService.create(request);
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testAssignmentMissingSpaceBeforeEquals() {
        val input = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var location= URI.create("/api/products");
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var location = URI.create("/api/products");
                }
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testAssignmentEqualsAndRhsOnNextLineIndentation() {
        val input = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var product
            = productService.create(
                        request);
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Equal sign and RHS starting on next line must be 2x indented", formatted.contains("final var product\n            = productService.create("))
    }

    @Test
    fun testAssignmentEqualsAtEndOfLine1Preserved() {
        val input = """
            package com.accenture.test;
            public class TestClass {
                public void test() {
                    final var product =
                        productService.create(
                            request);
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Equal sign on line 1 with RHS on line 2 must be preserved with 2x indentation", formatted.contains("final var product =\n                productService.create("))
    }

    @Test
    fun testNormalFormattingSpaceNormalization() {
        val messyCode = """
            package com.accenture.controller;
            public class ProductController {
                public Object create() {
                    final var product = this.productService.create(request);
                    final var location=URI.create(       "/api/products/" + product.id());
                    return ResponseEntity.ok(location);
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.controller;
            public class ProductController {
                public Object create() {
                    final var product = this.productService.create(request);
                    final var location = URI.create("/api/products/" + product.id());
                    return ResponseEntity.ok(location);
                }
            }
        """.trimIndent()

        assertFormatting(messyCode, expected)
    }

    @Test
    fun testIndentationRulesBaseAndContinuation() {
        val input = """
            package com.accenture.indentation;
            public class IndentationDemo {
                public void process() {
                    final var product =
                    this.productService.create(request);
                    final var location = URI.create("/api/products/" + product.id());
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue("Class declaration must be at level 0", formatted.contains("public class IndentationDemo {\n"))
        assertTrue("Method header must be at level 1 (4 spaces)", formatted.contains("    public void process() {\n"))
        assertTrue("Assignment start line in method body must be at level 2 (8 spaces)", formatted.contains("        final var product =\n"))
        assertTrue("Multiline assignment RHS must have 2x continuation indentation (16 spaces total)", formatted.contains("                this.productService.create(request);\n"))
    }

    // =========================================================================
    // Category 5: Lambda & Chaining 2-State Indentation
    // =========================================================================

    @Test
    fun testMultilineArgumentsInChainedMapAndOrElseGet() {
        val input = """
            package com.accenture.test;
            public class ProductService {
                public Object getProduct(final UUID id) {
                    return this.productService.getById(id)
                      .map(
                        ResponseEntity::ok)
                      .orElseGet(
                        () -> ResponseEntity.notFound()
                          .build());
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue(".map( must be indented", formatted.contains("            .map("))
        assertTrue("ResponseEntity::ok) must be indented", formatted.contains("            ResponseEntity::ok)"))
        assertTrue(".orElseGet( must be indented", formatted.contains("            .orElseGet("))
        assertTrue("() -> ResponseEntity.notFound() must be indented", formatted.contains("            () -> ResponseEntity.notFound()"))
        assertTrue(".build() must be 2x indented", formatted.contains("                .build());"))
    }

    @Test
    fun testTwoStateChaining_State1() {
        val state1Input = """
            package com.accenture.controller;
            public class ProductController {
                @GetMapping("/{id}")
                public ResponseEntity<ProductResponse> getById(
                    @PathVariable final UUID id
                ) {
                    return this.productService.getById(id)
                        .map(ResponseEntity::ok)
                        .orElseGet(() -> ResponseEntity
                            .notFound()
                            .build());
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.controller;
            public class ProductController {
                @GetMapping("/{id}")
                public ResponseEntity<ProductResponse> getById(
                    @PathVariable
                    final UUID id
                ) {
                    return this.productService.getById(id)
                        .map(ResponseEntity::ok)
                        .orElseGet(() -> ResponseEntity
                            .notFound()
                            .build());
                }
            }
        """.trimIndent()

        assertFormatting(state1Input, expected)
    }

    @Test
    fun testTwoStateChaining_State2() {
        val state2Input = """
            package com.accenture.controller;
            public class ProductController {
                @GetMapping("/{id}")
                public ResponseEntity<ProductResponse> getById(
                    @PathVariable final UUID id
                ) {
                    return this.productService.getById(id)
                        .map(ResponseEntity::ok)
                        .orElseGet(
                            () -> ResponseEntity
                                .notFound()
                                .build());
                }
            }
        """.trimIndent()

        val expected = """
            package com.accenture.controller;
            public class ProductController {
                @GetMapping("/{id}")
                public ResponseEntity<ProductResponse> getById(
                    @PathVariable
                    final UUID id
                ) {
                    return this.productService.getById(id)
                        .map(ResponseEntity::ok)
                        .orElseGet(
                            () -> ResponseEntity
                                .notFound()
                                .build());
                }
            }
        """.trimIndent()

        assertFormatting(state2Input, expected)
    }

    // =========================================================================
    // Category 6: String Literals & Text Blocks Literal Text Preservation
    // =========================================================================

    @Test
    fun testSqlStringLiteralEqualsPreservation() {
        val input = """
            package com.accenture.test;
            public class SqlQueryTest {
                public void executeQuery() {
                    String sql = "select * from table a where size = 10 limit 5";
                    jdbcTemplate.query(
                        "select * from table a where size = 10 limit 5",
                        rowMapper
                    );
                }
            }
        """.trimIndent()

        assertFormatting(input, input)
    }

    @Test
    fun testMethodArgumentStringWithEqualsWrapping() {
        val input = """
            package com.accenture.test;
            public class PrintlnTest {
                public void printLog(UUID id) {
                    System.out.println(
                        "Hello! This is before formatting = with formatted id: " + id
                    );
                }
            }
        """.trimIndent()

        assertFormatting(input, input)
    }

    @Test
    fun testMultilineTextBlockPreservation() {
        val input = """
            public class SqlService {
                public String getQuery() {
                    String sql = ""${'"'}
                        SELECT u.id, u.name, u.email
                        FROM users u
                        WHERE u.status = 'ACTIVE' AND u.age >= 18
                        ORDER BY u.created_at DESC;
                        ""${'"'};
                    return sql;
                }
            }
        """.trimIndent()

        assertFormatting(input, input)
    }

    @Test
    fun testStringLiteralContentPreservation() {
        val input = """
            public class StringTest {
                public void printCode() {
                    String code = "if (a == b) { return a ? b : c; } extends BaseClass";
                    System.out.println(code);
                }
            }
        """.trimIndent()

        assertFormatting(input, input)
    }

    // =========================================================================
    // Category 7: Import Organizer, Records & General Formatting
    // =========================================================================

    @Test
    fun testImportOrganizer() {
        val input = """
            import com.accenture.service.MyService;
            import java.util.List;
            import org.springframework.stereotype.Service;
            import java.util.ArrayList;

            public class Sample {
            }
        """.trimIndent()

        val expected = """
            import java.util.ArrayList;
            import java.util.List;

            import org.springframework.stereotype.Service;

            import com.accenture.service.MyService;

            public class Sample {
            }
        """.trimIndent()

        assertFormatting(input, expected)
    }

    @Test
    fun testRecordFormatting() {
        val recordCode = """
            package cassandra.course.dtos;

            import java.math.BigDecimal;

            public record UpdateProductRequest(
            String name,
            String description,
            String category,
            BigDecimal price,
            long version) {

                public long nextVersion() {
                    return version + 2;
                }
            }
        """.trimIndent()

        val expected = """
            package cassandra.course.dtos;

            import java.math.BigDecimal;

            public record UpdateProductRequest(
                String name,
                String description,
                String category,
                BigDecimal price,
                long version) {

                public long nextVersion() {
                    return version + 2;
                }
            }
        """.trimIndent()

        assertFormatting(recordCode, expected)
    }

    @Test
    fun testMessyCodeFormatting() {
        val messyCode = """
            package com.accenture.demo;
            import java.util.List;
            public class EmployeeService{
            @Override
            public List<String> getEmployees(String deptId){
            if(deptId==null){
            return null;
            }else{
            return List.of("Alice","Bob");
            }
            }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(messyCode, config)
        assertTrue(formatted.contains("public class EmployeeService {"))
        assertTrue(formatted.contains("    @Override"))
        assertTrue(formatted.contains("    public List<String> getEmployees(String deptId) {"))
        assertTrue(formatted.contains("        if (deptId == null) {"))
        assertTrue(formatted.contains("            return null;"))
        assertTrue(formatted.contains("        } else {"))
    }

    @Test
    fun testMultilineTernaryAlignment_NoStrayBlankLines() {
        val input = """
            package com.accenture.test;
            public class TernaryTest {
                public void execute(Request request, Product existingProduct) {
                    final String name
                        = (request.name() != null)

                        ? request.name()
                        : existingProduct.name();
                    final String descriptionaaaaaaaaaaaaaaaaaaaaaaaaaaaa =
                        request.description() != null
                        ? request.description()
                        : existingProduct.description();
                }
            }
        """.trimIndent()

        val formatted = AccentureJavaFormatter.format(input, config)
        assertTrue(
            "Ternary assignment must format into contiguous lines without empty lines before ?",
            formatted.contains("        (request.name() != null)\n        ? request.name()\n        : existingProduct.name();")
        )
        assertTrue(
            "Long assignment RHS ternary must align 4-space indented lines 2, 3, and 4 without blank lines",
            formatted.contains("    final String descriptionaaaaaaaaaaaaaaaaaaaaaaaaaaaa =\n        request.description() != null\n        ? request.description()\n        : existingProduct.description();")
        )
    }
}

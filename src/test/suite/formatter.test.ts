import * as assert from 'assert';
import { JavaFormatter } from '../../formatter/javaFormatter';
import { ACCENTURE_DEFAULT_CONFIG, parseEclipseXmlConfig, generateAccentureXmlConfig } from '../../formatter/config';
import { organizeJavaImports } from '../../formatter/organizeImports';
import * as fs from 'fs';
import * as path from 'path';

describe('Accenture Java Formatter Test Suite', () => {

    it('organizeJavaImports should sort and group Java imports correctly', () => {
        const inputLines = [
            'package com.accenture.demo;',
            '',
            'import com.accenture.service.UserService;',
            'import java.util.List;',
            'import static org.junit.Assert.assertEquals;',
            'import org.springframework.web.bind.annotation.RestController;',
            'import java.util.ArrayList;',
            'import javax.annotation.PostConstruct;',
            ''
        ];

        const result = organizeJavaImports(inputLines);
        assert.strictEqual(result.hasImports, true);
        
        const expectedImports = [
            'import static org.junit.Assert.assertEquals;',
            '',
            'import java.util.ArrayList;',
            'import java.util.List;',
            '',
            'import javax.annotation.PostConstruct;',
            '',
            'import org.springframework.web.bind.annotation.RestController;',
            '',
            'import com.accenture.service.UserService;'
        ].join('\n');

        assert.strictEqual(result.importsText, expectedImports);
    });

    it('JavaFormatter should format unformatted Java source code cleanly', () => {
        const messyCode = [
            'package com.accenture.demo;',
            'import java.util.List;',
            'public class EmployeeService{',
            ' @Override',
            'public List<String> getEmployees(String deptId){',
            'if(deptId==null){',
            'return null;',
            '}else{',
            'return List.of("Alice","Bob");',
            '}',
            '}',
            '}'
        ].join('\n');

        const formatter = new JavaFormatter(ACCENTURE_DEFAULT_CONFIG);
        const formatted = formatter.formatDocument(messyCode);

        assert.ok(formatted.includes('public class EmployeeService {'));
        assert.ok(formatted.includes('  @Override'));
        assert.ok(formatted.includes('  public List<String> getEmployees(String deptId) {'));
        assert.ok(formatted.includes('    if (deptId == null) {'));
        assert.ok(formatted.includes('      return null;'));
        assert.ok(formatted.includes('    } else {'));
    });

    it('JavaFormatter should properly indent Java record components and multiline fields', () => {
        const recordCode = [
            'package cassandra.course.dtos;',
            '',
            'import java.math.BigDecimal;',
            '',
            'public record UpdateProductRequest(',
            'String name,',
            'String description,',
            'String category,',
            'BigDecimal price,',
            'long version) {',
            '',
            '  public long nextVersion() {',
            '    return version + 1;',
            '  }',
            '}'
        ].join('\n');

        const formatter = new JavaFormatter(ACCENTURE_DEFAULT_CONFIG);
        const formatted = formatter.formatDocument(recordCode);

        assert.ok(formatted.includes('    String name,'));
        assert.ok(formatted.includes('    String description,'));
        assert.ok(formatted.includes('    String category,'));
        assert.ok(formatted.includes('    BigDecimal price,'));
        assert.ok(formatted.includes('    long version) {'));
        assert.ok(formatted.includes('  public long nextVersion() {'));
        assert.ok(formatted.includes('    return version + 1;'));
    });

    it('generateAccentureXmlConfig should output valid Eclipse profile XML', () => {
        const xml = generateAccentureXmlConfig();
        assert.ok(xml.includes('<profiles version="12">'));
        assert.ok(xml.includes('Accenture Standard Java Profile'));
        assert.ok(xml.includes('org.eclipse.jdt.core.formatter.lineSplit'));
    });

    it('parseEclipseXmlConfig should extract indentation and line length settings', () => {
        const tempXmlPath = path.join(__dirname, 'test-formatter.xml');
        fs.writeFileSync(tempXmlPath, generateAccentureXmlConfig(), 'utf8');

        try {
            const config = parseEclipseXmlConfig(tempXmlPath);
            assert.strictEqual(config.tabSize, 2);
            assert.strictEqual(config.insertSpaces, true);
            assert.strictEqual(config.maxLineLength, 120);
        } finally {
            if (fs.existsSync(tempXmlPath)) {
                fs.unlinkSync(tempXmlPath);
            }
        }
    });

});

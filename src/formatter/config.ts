import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FormatterConfig {
    tabSize: number;
    insertSpaces: boolean;
    maxLineLength: number;
    preset: 'Accenture Standard' | 'Google Java Style' | 'Eclipse Default' | 'Spring Framework Style';
    formatComments: boolean;
    organizeImportsOnFormat: boolean;
    braceStyle: 'sameLine' | 'nextLine';
    spaceBeforeMethodParenthesis: boolean;
    blankLinesBeforeMethod: number;
    alignAnnotations: boolean;
    xmlSettingsUrl?: string;
    xmlProfileName?: string;
    onSave?: boolean;
    formatOnChange?: boolean;
}

export const ACCENTURE_DEFAULT_CONFIG: FormatterConfig = {
    tabSize: 2,
    insertSpaces: true,
    maxLineLength: 80,
    preset: 'Accenture Standard',
    formatComments: true,
    organizeImportsOnFormat: true,
    braceStyle: 'sameLine',
    spaceBeforeMethodParenthesis: false,
    blankLinesBeforeMethod: 1,
    alignAnnotations: true,
    onSave: true,
    formatOnChange: false
};

export const PRESET_CONFIGS: Record<string, Partial<FormatterConfig>> = {
    'Accenture Standard': {
        tabSize: 2,
        insertSpaces: true,
        maxLineLength: 80,
        braceStyle: 'sameLine',
        spaceBeforeMethodParenthesis: false,
        blankLinesBeforeMethod: 1
    },
    'Google Java Style': {
        tabSize: 2,
        insertSpaces: true,
        maxLineLength: 80,
        braceStyle: 'sameLine',
        spaceBeforeMethodParenthesis: false,
        blankLinesBeforeMethod: 1
    },
    'Eclipse Default': {
        tabSize: 4,
        insertSpaces: false,
        maxLineLength: 80,
        braceStyle: 'sameLine',
        spaceBeforeMethodParenthesis: false,
        blankLinesBeforeMethod: 1
    },
    'Spring Framework Style': {
        tabSize: 4,
        insertSpaces: true,
        maxLineLength: 80,
        braceStyle: 'sameLine',
        spaceBeforeMethodParenthesis: false,
        blankLinesBeforeMethod: 1
    }
};

export function getFormatterConfig(document?: vscode.TextDocument): FormatterConfig {
    let vscodeConfig: any;
    try {
        if (typeof vscode !== 'undefined' && vscode.workspace) {
            vscodeConfig = vscode.workspace.getConfiguration('accentureJava.format', document?.uri);
        }
    } catch (e) {
        // Fallback for standalone runner environment
    }
    
    const preset = vscodeConfig ? vscodeConfig.get('preset', 'Accenture Standard') : 'Accenture Standard';
    const basePreset = PRESET_CONFIGS[preset] || PRESET_CONFIGS['Accenture Standard'];

    const config: FormatterConfig = {
        tabSize: vscodeConfig ? vscodeConfig.get('tabSize', basePreset.tabSize ?? 2) : (basePreset.tabSize ?? 2),
        insertSpaces: vscodeConfig ? vscodeConfig.get('insertSpaces', basePreset.insertSpaces ?? true) : (basePreset.insertSpaces ?? true),
        maxLineLength: vscodeConfig ? vscodeConfig.get('maxLineLength', basePreset.maxLineLength ?? 80) : (basePreset.maxLineLength ?? 80),
        preset: preset as FormatterConfig['preset'],
        formatComments: vscodeConfig ? vscodeConfig.get('comments.enabled', true) : true,
        organizeImportsOnFormat: vscodeConfig ? vscodeConfig.get('imports.organizeOnFormat', true) : true,
        braceStyle: (basePreset.braceStyle as any) || 'sameLine',
        spaceBeforeMethodParenthesis: basePreset.spaceBeforeMethodParenthesis ?? false,
        blankLinesBeforeMethod: basePreset.blankLinesBeforeMethod ?? 1,
        alignAnnotations: true,
        xmlSettingsUrl: vscodeConfig ? vscodeConfig.get('settings.url', '') : '',
        xmlProfileName: vscodeConfig ? vscodeConfig.get('settings.profile', '') : '',
        onSave: vscodeConfig ? vscodeConfig.get('onSave', true) : true,
        formatOnChange: vscodeConfig ? vscodeConfig.get('formatOnChange', false) : false
    };

    // If an XML settings file is provided, try loading Eclipse XML overrides
    if (config.xmlSettingsUrl) {
        try {
            const xmlOverrides = parseEclipseXmlConfig(config.xmlSettingsUrl, config.xmlProfileName, document);
            Object.assign(config, xmlOverrides);
        } catch (err) {
            console.warn(`[Accenture Java Formatter] Failed to load XML config from ${config.xmlSettingsUrl}:`, err);
        }
    }

    return config;
}

/**
 * Basic XML parser for Eclipse JDT Formatter XML settings profiles
 */
export function parseEclipseXmlConfig(filePathOrUrl: string, profileName?: string, document?: vscode.TextDocument): Partial<FormatterConfig> {
    let resolvedPath = filePathOrUrl;
    if (document && !path.isAbsolute(resolvedPath) && typeof vscode !== 'undefined' && vscode.workspace && vscode.workspace.getWorkspaceFolder(document.uri)) {
        const rootPath = vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath;
        resolvedPath = path.resolve(rootPath, filePathOrUrl);
    }

    if (!fs.existsSync(resolvedPath)) {
        return {};
    }

    const xmlContent = fs.readFileSync(resolvedPath, 'utf8');
    const overrides: Partial<FormatterConfig> = {};

    // Simple regex-based XML extraction for Eclipse format settings
    const tabSizeMatch = xmlContent.match(/id="org.eclipse.jdt.core.formatter.tabulation.size"\s+value="(\d+)"/);
    if (tabSizeMatch) {
        overrides.tabSize = parseInt(tabSizeMatch[1], 10);
    }

    const tabCharMatch = xmlContent.match(/id="org.eclipse.jdt.core.formatter.tabulation.char"\s+value="([^"]+)"/);
    if (tabCharMatch) {
        overrides.insertSpaces = tabCharMatch[1] === 'space';
    }

    const lineLengthMatch = xmlContent.match(/id="org.eclipse.jdt.core.formatter.lineSplit"\s+value="(\d+)"/);
    if (lineLengthMatch) {
        overrides.maxLineLength = parseInt(lineLengthMatch[1], 10);
    }

    const braceMatch = xmlContent.match(/id="org.eclipse.jdt.core.formatter.brace_position_for_[^"]+"\s+value="([^"]+)"/);
    if (braceMatch) {
        overrides.braceStyle = braceMatch[1].includes('next_line') ? 'nextLine' : 'sameLine';
    }

    return overrides;
}

export function generateAccentureXmlConfig(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<profiles version="12">
    <profile kind="CodeFormatterProfile" name="Accenture Standard Java Profile" version="12">
        <setting id="org.eclipse.jdt.core.formatter.tabulation.char" value="space"/>
        <setting id="org.eclipse.jdt.core.formatter.tabulation.size" value="2"/>
        <setting id="org.eclipse.jdt.core.formatter.lineSplit" value="120"/>
        <setting id="org.eclipse.jdt.core.formatter.brace_position_for_type_declaration" value="end_of_line"/>
        <setting id="org.eclipse.jdt.core.formatter.brace_position_for_method_declaration" value="end_of_line"/>
        <setting id="org.eclipse.jdt.core.formatter.brace_position_for_block" value="end_of_line"/>
        <setting id="org.eclipse.jdt.core.formatter.comment.format_javadoc_comments" value="true"/>
        <setting id="org.eclipse.jdt.core.formatter.comment.format_line_comments" value="true"/>
        <setting id="org.eclipse.jdt.core.formatter.comment.line_length" value="120"/>
        <setting id="org.eclipse.jdt.core.formatter.blank_lines_before_method" value="1"/>
        <setting id="org.eclipse.jdt.core.formatter.blank_lines_before_package" value="0"/>
        <setting id="org.eclipse.jdt.core.formatter.blank_lines_after_package" value="1"/>
        <setting id="org.eclipse.jdt.core.formatter.blank_lines_before_imports" value="1"/>
        <setting id="org.eclipse.jdt.core.formatter.blank_lines_after_imports" value="1"/>
    </profile>
</profiles>
`;
}

export interface OrganizedImportResult {
    importsText: string;
    startLineIndex: number;
    endLineIndex: number;
    hasImports: boolean;
}

export function organizeJavaImports(codeLines: string[]): OrganizedImportResult {
    let importStartIndex = -1;
    let importEndIndex = -1;

    const staticImports: string[] = [];
    const javaImports: string[] = [];
    const javaxImports: string[] = [];
    const accentureImports: string[] = [];
    const orgImports: string[] = [];
    const comImports: string[] = [];
    const otherImports: string[] = [];

    const importRegex = /^\s*import\s+(static\s+)?([a-zA-Z0-9_$.*]+)\s*;\s*$/;

    for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i].trim();

        if (line.startsWith('import ')) {
            if (importStartIndex === -1) {
                importStartIndex = i;
            }
            importEndIndex = i;

            const match = line.match(importRegex);
            if (match) {
                const isStatic = !!match[1];
                const fullImport = match[2];

                if (isStatic) {
                    staticImports.push(`import static ${fullImport};`);
                } else if (fullImport.startsWith('java.')) {
                    javaImports.push(`import ${fullImport};`);
                } else if (fullImport.startsWith('javax.') || fullImport.startsWith('jakarta.')) {
                    javaxImports.push(`import ${fullImport};`);
                } else if (fullImport.startsWith('com.accenture.')) {
                    accentureImports.push(`import ${fullImport};`);
                } else if (fullImport.startsWith('org.')) {
                    orgImports.push(`import ${fullImport};`);
                } else if (fullImport.startsWith('com.')) {
                    comImports.push(`import ${fullImport};`);
                } else {
                    otherImports.push(`import ${fullImport};`);
                }
            } else {
                // If it doesn't strictly match simple regex, store in otherImports
                otherImports.push(line);
            }
        } else if (importStartIndex !== -1 && line !== '' && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
            // Reached non-import code after imports
            break;
        }
    }

    if (importStartIndex === -1) {
        return {
            importsText: '',
            startLineIndex: -1,
            endLineIndex: -1,
            hasImports: false
        };
    }

    const uniqueAndSorted = (arr: string[]) => Array.from(new Set(arr)).sort();

    const groups = [
        uniqueAndSorted(staticImports),
        uniqueAndSorted(javaImports),
        uniqueAndSorted(javaxImports),
        uniqueAndSorted(orgImports),
        uniqueAndSorted(comImports),
        uniqueAndSorted(accentureImports),
        uniqueAndSorted(otherImports)
    ].filter(g => g.length > 0);

    const formattedGroupsText = groups.map(g => g.join('\n')).join('\n\n');

    return {
        importsText: formattedGroupsText,
        startLineIndex: importStartIndex,
        endLineIndex: importEndIndex,
        hasImports: true
    };
}

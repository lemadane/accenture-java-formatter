package com.accenture.formatter

class LegacyAccentureJavaFormatter(val config: AccentureFormatterConfig = AccentureFormatterConfig()) {

    fun formatDocument(sourceCode: String): String {
        var lines = sourceCode.split("\r\n", "\n")

        if (config.organizeImportsOnFormat) {
            val importResult = AccentureImportOrganizer.organizeJavaImports(lines)
            if (importResult.hasImports) {
                val beforeImports = lines.subList(0, importResult.startLineIndex)
                val afterImports = lines.subList(importResult.endLineIndex + 1, lines.size)
                val organizedLines = importResult.importsText.split("\n")
                lines = beforeImports + organizedLines + listOf("") + afterImports
            }
        }

        lines = preprocessFormattingRules(lines)
        return formatCodeLines(lines)
    }

    private fun preprocessFormattingRules(lines: List<String>): List<String> {
        var result = lines
        result = applyRule5Clauses(result)
        result = applyRule4MethodParams(result)
        result = applyRule1Annotations(result)
        result = applyRuleTernaryOperators(result)
        result = applyRule7AssignmentRhs(result)
        result = applyRule6MethodCalls(result)
        result = applyRule8ChainedCalls(result)
        return result
    }

    private fun applyRule1Annotations(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var inTextBlock = false

        for (line in lines) {
            if (inTextBlock) {
                output.add(line)
                if (line.contains("\"\"\"")) inTextBlock = false
                continue
            }
            if (line.contains("\"\"\"")) {
                val count = Regex("""\"\"\"""").findAll(line).count()
                if (count % 2 != 0) inTextBlock = true
            }

            val trimmed = line.trim()
            if (!trimmed.contains("@") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
                output.add(line)
                continue
            }

            if (trimmed.startsWith("@") && trimmed.contains("(") && trimmed.endsWith(")") && trimmed.length >= config.maxLineLength) {
                val openIdx = trimmed.indexOf('(')
                val closeIdx = trimmed.lastIndexOf(')')
                if (openIdx != -1 && closeIdx > openIdx) {
                    val prefix = trimmed.substring(0, openIdx + 1)
                    val body = trimmed.substring(openIdx + 1, closeIdx)
                    val suffix = trimmed.substring(closeIdx)
                    val args = splitParameters(body).map { it.trim() }
                    if (args.size > 1) {
                        output.add(prefix)
                        for (aIdx in args.indices) {
                            if (aIdx < args.size - 1) {
                                output.add("${args[aIdx]},")
                            } else {
                                output.add(args[aIdx])
                            }
                        }
                        output.add(suffix)
                        continue
                    }
                }
            }

            if (!trimmed.startsWith("@") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || (trimmed.startsWith("@") && trimmed.endsWith("("))) {
                output.add(line)
                continue
            }

            val annotationRegex = Regex("""@\w+(\([^)]*\))?""")
            val matches = annotationRegex.findAll(trimmed).toList()

            if (matches.isEmpty() || (matches.size == 1 && matches[0].range.first == 0 && matches[0].value.length == trimmed.length)) {
                output.add(line)
                continue
            }

            var lastIdx = 0
            for (m in matches) {
                val textBefore = trimmed.substring(lastIdx, m.range.first).trim()
                if (textBefore.isNotEmpty()) {
                    output.add(textBefore)
                }
                output.add(m.value)
                lastIdx = m.range.last + 1
            }

            val textAfter = trimmed.substring(lastIdx).trim()
            if (textAfter.isNotEmpty()) {
                output.add(textAfter)
            }
        }

        return output
    }

    private fun applyRule5Clauses(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var inTextBlock = false

        for (line in lines) {
            if (inTextBlock) {
                output.add(line)
                if (line.contains("\"\"\"")) inTextBlock = false
                continue
            }
            if (line.contains("\"\"\"")) {
                val count = Regex("""\"\"\"""").findAll(line).count()
                if (count % 2 != 0) inTextBlock = true
            }

            val trimmed = line.trim()
            if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
                output.add(line)
                continue
            }

            val codeWithoutStrings = trimmed.replace(Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')"""), "\"\"")
            val clauseRegex = Regex("""\b(extends|implements|throws)\b""")
            val hasExtends = Regex("""\bextends\b""").containsMatchIn(codeWithoutStrings) && !codeWithoutStrings.startsWith("extends")
            val hasImplements = Regex("""\bimplements\b""").containsMatchIn(codeWithoutStrings) && !codeWithoutStrings.startsWith("implements")
            val hasThrows = Regex("""\bthrows\b""").containsMatchIn(codeWithoutStrings) && !codeWithoutStrings.startsWith("throws")

            if (!hasExtends && !hasImplements && !hasThrows) {
                output.add(line)
                continue
            }

            val parts = mutableListOf<String>()
            var lastIdx = 0
            for (m in clauseRegex.findAll(trimmed)) {
                val partBefore = trimmed.substring(lastIdx, m.range.first).trim()
                if (partBefore.isNotEmpty()) parts.add(partBefore)
                lastIdx = m.range.first
            }
            val finalPart = trimmed.substring(lastIdx).trim()
            if (finalPart.isNotEmpty()) parts.add(finalPart)

            output.addAll(parts)
        }

        return output
    }

    private fun applyRule4MethodParams(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var i = 0

        while (i < lines.size) {
            val line = lines[i]
            val trimmed = line.trim()

            val isMethodOrConstructorStart =
                trimmed.contains("(") &&
                !trimmed.contains("record ") && !trimmed.contains("class ") && !trimmed.contains("interface ") &&
                (trimmed.startsWith("public ") || trimmed.startsWith("protected ") || trimmed.startsWith("private ") || trimmed.startsWith("abstract ")) &&
                !trimmed.startsWith("if") &&
                !trimmed.startsWith("for") &&
                !trimmed.startsWith("while") &&
                !trimmed.startsWith("switch") &&
                !trimmed.startsWith("catch") &&
                !trimmed.startsWith("return") &&
                !trimmed.contains(" = ")

            if (isMethodOrConstructorStart) {
                var j = i + 1
                var fullText = trimmed

                while (j < lines.size && !fullText.contains(") {") && !fullText.endsWith("{") && !fullText.endsWith(");") && !fullText.endsWith(")")) {
                    fullText += " " + lines[j].trim()
                    j++
                }

                val openParenIdx = fullText.indexOf('(')
                val closeParenIdx = fullText.lastIndexOf(')')

                if (openParenIdx != -1 && closeParenIdx > openParenIdx) {
                    val headerPrefix = fullText.substring(0, openParenIdx).trim()
                    val paramsContent = fullText.substring(openParenIdx + 1, closeParenIdx).trim()
                    val headerSuffix = fullText.substring(closeParenIdx + 1).trim()

                    if (paramsContent.isNotEmpty()) {
                        val processedParams = splitParameters(paramsContent).map { it.trim() }

                        if (processedParams.size > 1) {
                            output.add("$headerPrefix(")
                            for (pIdx in processedParams.indices) {
                                val isLast = pIdx == processedParams.size - 1
                                if (isLast) {
                                    output.add(processedParams[pIdx])
                                    output.add(")${if (headerSuffix.isNotEmpty()) " $headerSuffix" else ""}")
                                } else {
                                    output.add("${processedParams[pIdx]},")
                                }
                            }
                            i = j
                            continue
                        } else {
                            val singleLineHeader = "$headerPrefix(${processedParams[0]})${if (headerSuffix.isNotEmpty()) " $headerSuffix" else ""}"
                            if (singleLineHeader.length + 4 >= config.maxLineLength) {
                                output.add("$headerPrefix(")
                                output.add(processedParams[0])
                                output.add(")${if (headerSuffix.isNotEmpty()) " $headerSuffix" else ""}")
                            } else {
                                output.add(singleLineHeader)
                            }
                            i = j
                            continue
                        }
                    }
                }
            }

            output.add(line)
            i++
        }

        return output
    }

    private fun applyRule6MethodCalls(lines: List<String>): List<String> {
        val output = mutableListOf<String>()

        for (line in lines) {
            var trimmed = line.trim()
            var isRhs = false
            if (trimmed.startsWith("ASSIGN_RHS:")) {
                isRhs = true
                trimmed = trimmed.substring("ASSIGN_RHS:".length).trim()
            }

            val isMethodCall =
                trimmed.contains("(") &&
                (trimmed.endsWith(");") || trimmed.endsWith(")") || trimmed.endsWith("),")) &&
                !trimmed.startsWith("@") &&
                !trimmed.startsWith("public ") &&
                !trimmed.startsWith("private ") &&
                !trimmed.startsWith("protected ") &&
                !trimmed.startsWith("class ") &&
                !trimmed.startsWith("if ") &&
                !trimmed.startsWith("for ") &&
                !trimmed.startsWith("while ")

            if (isMethodCall) {
                val openParenIdx = trimmed.indexOf('(')
                val closeParenIdx = trimmed.lastIndexOf(')')

                if (openParenIdx != -1 && closeParenIdx > openParenIdx) {
                    val callPrefix = trimmed.substring(0, openParenIdx).trim()
                    val argsContent = trimmed.substring(openParenIdx + 1, closeParenIdx).trim()
                    val callSuffix = trimmed.substring(closeParenIdx + 1).trim()

                    if (argsContent.isNotEmpty()) {
                        val args = splitParameters(argsContent)
                        if (args.size > 1) {
                            val prefix = if (isRhs) "ASSIGN_RHS:$callPrefix" else callPrefix
                            output.add("$prefix(")
                            for (aIdx in args.indices) {
                                val isLast = aIdx == args.size - 1
                                if (isLast) {
                                    output.add(args[aIdx].trim())
                                    output.add(")$callSuffix")
                                } else {
                                    output.add("${args[aIdx].trim()},")
                                }
                            }
                            continue
                        } else if (args.size == 1 && line.length >= config.maxLineLength) {
                            val prefix = if (isRhs) "ASSIGN_RHS:$callPrefix" else callPrefix
                            output.add("$prefix(")
                            output.add("${args[0].trim()})$callSuffix")
                            continue
                        }
                    }
                }
            }

            output.add(if (isRhs) "ASSIGN_RHS:$trimmed" else line)
        }

        return output
    }

    private fun applyRule8ChainedCalls(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var inTextBlock = false

        for (line in lines) {
            if (inTextBlock) {
                output.add(line)
                if (line.contains("\"\"\"")) inTextBlock = false
                continue
            }
            if (line.contains("\"\"\"")) {
                val count = Regex("""\"\"\"""").findAll(line).count()
                if (count % 2 != 0) inTextBlock = true
            }

            var trimmed = line.trim()
            var isRhs = false
            if (trimmed.startsWith("ASSIGN_RHS:")) {
                isRhs = true
                trimmed = trimmed.substring("ASSIGN_RHS:".length).trim()
            }

            if (trimmed.startsWith("import ") || trimmed.startsWith("package ") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("?") || trimmed.startsWith(":")) {
                output.add(line)
                continue
            }

            val topLevelDotIndices = mutableListOf<Int>()
            var parenDepth = 0
            var inString = false
            var stringChar = ' '

            for (idx in trimmed.indices) {
                val char = trimmed[idx]
                if (inString) {
                    if (char == stringChar && (idx == 0 || trimmed[idx - 1] != '\\')) {
                        inString = false
                    }
                    continue
                }
                if (char == '"' || char == '\'') {
                    inString = true
                    stringChar = char
                    continue
                }
                if (char == '(') parenDepth++
                else if (char == ')') parenDepth = maxOf(0, parenDepth - 1)
                else if (char == '.' && parenDepth == 0) {
                    topLevelDotIndices.add(idx)
                }
            }

            val methodDotIndices = topLevelDotIndices.filter { idx ->
                val rest = trimmed.substring(idx)
                Regex("""^\.[a-zA-Z0-9_]+\s*\(""").containsMatchIn(rest)
            }

            if (methodDotIndices.size >= 2) {
                val firstDotIdx = methodDotIndices[0]
                val part1 = trimmed.substring(0, firstDotIdx).trim()
                val part2Raw = trimmed.substring(firstDotIdx).trim()

                val prefix = if (isRhs) "ASSIGN_RHS:$part1" else part1
                output.add(prefix)

                val chainMatches = mutableListOf<Int>()
                var pDepth = 0
                var strIn = false
                var sChar = ' '

                for (idx in part2Raw.indices) {
                    val char = part2Raw[idx]
                    if (strIn) {
                        if (char == sChar && (idx == 0 || part2Raw[idx - 1] != '\\')) strIn = false
                        continue
                    }
                    if (char == '"' || char == '\'') {
                        strIn = true
                        sChar = char
                        continue
                    }
                    if (char == '(') pDepth++
                    else if (char == ')') pDepth = maxOf(0, pDepth - 1)
                    else if (char == '.' && pDepth == 0) chainMatches.add(idx)
                }

                if (chainMatches.size <= 1) {
                    output.add(part2Raw)
                } else {
                    var lastIdx = 0
                    for (k in 1 until chainMatches.size) {
                        val chunk = part2Raw.substring(lastIdx, chainMatches[k]).trim()
                        if (chunk.isNotEmpty()) output.add(chunk)
                        lastIdx = chainMatches[k]
                    }
                    val lastChunk = part2Raw.substring(lastIdx).trim()
                    if (lastChunk.isNotEmpty()) output.add(lastChunk)
                }
                continue
            }

            output.add(if (isRhs) "ASSIGN_RHS:$trimmed" else line)
        }

        return output
    }

    private fun applyRule7AssignmentRhs(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var pendingAssignRhs = false

        for (idx in lines.indices) {
            val line = lines[idx]
            var trimmed = line.trim()

            if (pendingAssignRhs) {
                pendingAssignRhs = false

                val nextNonEmpty = lines
                    .drop(idx + 1)
                    .asSequence()
                    .map { it.trim() }
                    .firstOrNull { it.isNotEmpty() }

                val isTernaryConditionLine =
                    trimmed.startsWith("(") ||
                            trimmed.contains("!=") ||
                            trimmed.contains("==") ||
                            trimmed.contains("<") ||
                            trimmed.contains(">")

                if (isTernaryConditionLine && (nextNonEmpty?.startsWith("?") == true || nextNonEmpty?.startsWith(":") == true)) {
                    output.add(trimmed)
                } else {
                    output.add("ASSIGN_RHS:$trimmed")
                }
                continue
            }

            trimmed = normalizeAssignmentSpaces(trimmed)
            trimmed = normalizeParenSpaces(trimmed)

            val codeWithoutStrings = trimmed.replace(Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')"""), "\"\"")
            val eqIdx = findAssignmentOperatorIndex(trimmed)

            val isAssignment =
                eqIdx != -1 &&
                !codeWithoutStrings.startsWith("for ") &&
                !codeWithoutStrings.startsWith("if ") &&
                !codeWithoutStrings.startsWith("while ") &&
                !codeWithoutStrings.endsWith("{")

            if (isAssignment) {
                val lhs = trimmed.substring(0, eqIdx + 2).trim()
                val rhs = trimmed.substring(eqIdx + 3).trim()

                if (line.length >= config.maxLineLength) {
                    val nextNonEmpty = lines
                        .drop(idx + 1)
                        .asSequence()
                        .map { it.trim() }
                        .firstOrNull { it.isNotEmpty() }
                    val rhsLooksLikeTernaryCondition =
                        rhs.startsWith("(") ||
                                rhs.contains("!=") ||
                                rhs.contains("==") ||
                                rhs.contains("<") ||
                                rhs.contains(">")

                    output.add(lhs)
                    if (rhsLooksLikeTernaryCondition && (nextNonEmpty?.startsWith("?") == true || nextNonEmpty?.startsWith(":") == true)) {
                        output.add(rhs)
                    } else {
                        output.add("ASSIGN_RHS:$rhs")
                    }
                    continue
                }
            }

            val isLineEndingWithEquals =
                (codeWithoutStrings.endsWith(" =") || codeWithoutStrings.endsWith("=")) &&
                !codeWithoutStrings.startsWith("for ") &&
                !codeWithoutStrings.startsWith("if ") &&
                !codeWithoutStrings.startsWith("while ") &&
                !codeWithoutStrings.endsWith("{")

            if (isLineEndingWithEquals) {
                output.add(trimmed)
                pendingAssignRhs = true
                continue
            }

            output.add(line)
        }

        return output
    }

    private fun applyRuleTernaryOperators(lines: List<String>): List<String> {
        val output = mutableListOf<String>()
        var i = 0

        while (i < lines.size) {
            val line = lines[i]
            val trimmed = line.trim()
            val normalizedLine = if (trimmed.startsWith("ASSIGN_RHS:")) {
                trimmed.substring("ASSIGN_RHS:".length).trim()
            } else {
                trimmed
            }

            if (normalizedLine.startsWith("//") || normalizedLine.startsWith("/*") || normalizedLine.startsWith("*") || normalizedLine.startsWith("import ") || normalizedLine.startsWith("package ")) {
                output.add(line)
                i++
                continue
            }

            var statementText = normalizedLine
            var nextIndex = i + 1

            val startsAsContinuation = normalizedLine.startsWith("=") || trimmed.startsWith("ASSIGN_RHS:")

            var nextNonEmptyIndex = i + 1
            while (nextNonEmptyIndex < lines.size && lines[nextNonEmptyIndex].trim().isEmpty()) {
                nextNonEmptyIndex++
            }
            val nextNonEmptyTrimmed = if (nextNonEmptyIndex < lines.size) lines[nextNonEmptyIndex].trim() else ""

            val nextIsTernary = nextNonEmptyTrimmed.startsWith("?") || nextNonEmptyTrimmed.startsWith(":")
            val hasTernaryIndicators = statementText.contains('?') || statementText.contains(':') || normalizedLine.endsWith("=") || normalizedLine.contains(" =") || nextIsTernary

            if (hasTernaryIndicators && !statementText.endsWith(";") && !statementText.endsWith("{")) {
                var accumulated = statementText
                var lookaheadIdx = i + 1
                var foundTernary = accumulated.contains('?') || accumulated.contains(':')

                while (lookaheadIdx < lines.size) {
                    val nextRawTrimmed = lines[lookaheadIdx].trim()
                    val nextTrimmed = if (nextRawTrimmed.startsWith("ASSIGN_RHS:")) {
                        nextRawTrimmed.substring("ASSIGN_RHS:".length).trim()
                    } else {
                        nextRawTrimmed
                    }
                    if (nextTrimmed.startsWith("//") || nextTrimmed.startsWith("/*") || nextTrimmed.startsWith("@") || nextTrimmed.startsWith("class ") || nextTrimmed.startsWith("public ")) {
                        break
                    }
                    accumulated += " " + nextTrimmed
                    if (nextTrimmed.contains('?') || nextTrimmed.contains(':')) {
                        foundTernary = true
                    }
                    lookaheadIdx++
                    if (nextTrimmed.endsWith(";") || nextTrimmed.endsWith("{")) {
                        break
                    }
                }

                if (foundTernary && hasTernaryOperator(accumulated)) {
                    statementText = accumulated
                    nextIndex = lookaheadIdx
                }
            }

            if (hasTernaryOperator(statementText)) {
                val ternaryParts = splitTernaryExpression(statementText)
                if (ternaryParts != null) {
                    val (condition, trueExpr, falseExpr) = ternaryParts
                    val normalizedCond = normalizeOperatorSpaces(condition).replace(Regex("""\s*\.\s*"""), ".")
                    val normalizedTrue = trueExpr.trim().replace(Regex("""\s*\.\s*"""), ".")
                    val normalizedFalse = falseExpr.trim().replace(Regex("""\s*\.\s*"""), ".")

                    val fullSingleLine = "$normalizedCond ? $normalizedTrue : $normalizedFalse"
                    val isAssignmentTernary =
                        Regex("""(^|\s)=($|\s|\()""").containsMatchIn(normalizedCond) &&
                                !normalizedCond.contains("==")
                    val shouldWrapMultiline = isAssignmentTernary || startsAsContinuation || fullSingleLine.length >= config.maxLineLength

                    if (shouldWrapMultiline) {
                        var conditionLine = normalizedCond
                        if (conditionLine.startsWith("=") && output.isNotEmpty()) {
                            val previous = output.last()
                            output[output.lastIndex] = if (previous.trim().endsWith("=")) {
                                previous
                            } else {
                                "$previous ="
                            }
                            conditionLine = conditionLine.removePrefix("=").trim()
                        }

                        output.add(conditionLine)
                        output.add("? $normalizedTrue")
                        output.add(": $normalizedFalse")
                        i = nextIndex
                        continue
                    } else {
                        output.add(fullSingleLine)
                        i = nextIndex
                        continue
                    }
                }
            }

            output.add(line)
            i++
        }

        return output
    }

    private fun hasTernaryOperator(line: String): Boolean {
        var inString = false
        var stringChar = ' '
        var hasQuestion = false
        var hasColon = false

        for (i in line.indices) {
            val char = line[i]
            if (inString) {
                if (char == stringChar && (i == 0 || line[i - 1] != '\\')) inString = false
                continue
            }
            if (char == '"' || char == '\'') {
                inString = true
                stringChar = char
                continue
            }
            if (char == '?') {
                hasQuestion = true
            } else if (char == ':' && hasQuestion) {
                hasColon = true
            }
        }
        return hasQuestion && hasColon
    }

    private data class TernaryParts(val condition: String, val trueExpr: String, val falseExpr: String)

    private fun splitTernaryExpression(line: String): TernaryParts? {
        var inString = false
        var stringChar = ' '
        var questionIdx = -1
        var colonIdx = -1
        var depth = 0

        for (i in line.indices) {
            val char = line[i]
            if (inString) {
                if (char == stringChar && (i == 0 || line[i - 1] != '\\')) inString = false
                continue
            }
            if (char == '"' || char == '\'') {
                inString = true
                stringChar = char
                continue
            }
            if (char == '(' || char == '<' || char == '[') {
                depth++
            } else if (char == ')' || char == '>' || char == ']') {
                depth = maxOf(0, depth - 1)
            } else if (depth == 0) {
                if (char == '?' && questionIdx == -1) {
                    questionIdx = i
                } else if (char == ':' && questionIdx != -1 && colonIdx == -1) {
                    colonIdx = i
                }
            }
        }

        if (questionIdx != -1 && colonIdx != -1 && colonIdx > questionIdx) {
            val condition = line.substring(0, questionIdx).trim()
            val trueExpr = line.substring(questionIdx + 1, colonIdx).trim()
            val falseExpr = line.substring(colonIdx + 1).trim()
            return TernaryParts(condition, trueExpr, falseExpr)
        }

        return null
    }

    private fun findAssignmentOperatorIndex(line: String): Int {
        var inString = false
        var stringChar = ' '
        var parenDepth = 0

        for (i in 0 until line.length - 2) {
            val char = line[i]
            if (inString) {
                if (char == stringChar && (i == 0 || line[i - 1] != '\\')) inString = false
                continue
            }
            if (char == '"' || char == '\'') {
                inString = true
                stringChar = char
                continue
            }
            if (char == '(') parenDepth++
            else if (char == ')') parenDepth = maxOf(0, parenDepth - 1)

            if (parenDepth == 0 && line.substring(i, i + 3) == " = ") {
                return i
            }
        }
        return -1
    }

    private fun splitParameters(paramsContent: String): List<String> {
        val result = mutableListOf<String>()
        var current = StringBuilder()
        var depth = 0

        for (i in paramsContent.indices) {
            val char = paramsContent[i]
            if (char == '<' || char == '(' || char == '[') {
                depth++
                current.append(char)
            } else if (char == '>' || char == ')' || char == ']') {
                depth = maxOf(0, depth - 1)
                current.append(char)
            } else if (char == ',' && depth == 0) {
                result.add(current.toString().trim())
                current = StringBuilder()
            } else {
                current.append(char)
            }
        }

        if (current.toString().trim().isNotEmpty()) {
            result.add(current.toString().trim())
        }

        return result
    }

    private fun formatCodeLines(lines: List<String>): String {
        val formatted = formatLinesWithIndent(lines, 0)
        return postProcessBlankLines(formatted).joinToString("\n")
    }

    private fun formatLinesWithIndent(lines: List<String>, initialIndentLevel: Int): List<String> {
        val indentStr = if (config.insertSpaces) " ".repeat(config.tabSize) else "\t"
        var blockIndent = initialIndentLevel
        val parenIndentStack = mutableListOf<Int>()
        val outputLines = mutableListOf<String>()

        var inJavadoc = false
        var inBlockComment = false
        var inTextBlock = false

        for (i in lines.indices) {
            if (inTextBlock) {
                outputLines.add(lines[i])
                if (lines[i].contains("\"\"\"")) inTextBlock = false
                continue
            }

            var line = lines[i].trim()

            if (line.isEmpty()) {
                outputLines.add("")
                continue
            }

            if (line.contains("\"\"\"")) {
                val count = Regex("""\"\"\"""").findAll(line).count()
                if (count % 2 != 0) inTextBlock = true
            }

            var isAssignRhs = false
            if (line.startsWith("ASSIGN_RHS:")) {
                line = line.substring("ASSIGN_RHS:".length).trim()
                isAssignRhs = true
            }

            val startsWithClosingBrace = line.startsWith("}")
            if (startsWithClosingBrace) {
                blockIndent = maxOf(0, blockIndent - 1)
            }
            val startsWithClosingParen = line.startsWith(")") || line.startsWith(");")
            if (startsWithClosingParen && parenIndentStack.isNotEmpty()) {
                parenIndentStack.removeAt(parenIndentStack.size - 1)
            }

            val parenIndent = if (parenIndentStack.isNotEmpty()) parenIndentStack.last() else 0
            val previousNonEmptyLine = run {
                var j = i - 1
                var found = ""
                while (j >= 0) {
                    val t = lines[j].trim().removePrefix("ASSIGN_RHS:").trim()
                    if (t.isNotEmpty()) {
                        found = t
                        break
                    }
                    j--
                }
                found
            }
            val previousBeforeNonEmptyLine = run {
                var j = i - 1
                var seen = 0
                var found = ""
                while (j >= 0) {
                    val t = lines[j].trim().removePrefix("ASSIGN_RHS:").trim()
                    if (t.isNotEmpty()) {
                        seen++
                        if (seen == 2) {
                            found = t
                            break
                        }
                    }
                    j--
                }
                found
            }
            val previousThirdNonEmptyLine = run {
                var j = i - 1
                var seen = 0
                var found = ""
                while (j >= 0) {
                    val t = lines[j].trim().removePrefix("ASSIGN_RHS:").trim()
                    if (t.isNotEmpty()) {
                        seen++
                        if (seen == 3) {
                            found = t
                            break
                        }
                    }
                    j--
                }
                found
            }
            val isAssignmentTernaryBranchLine =
                (line.startsWith("?") &&
                        previousBeforeNonEmptyLine.endsWith("=") &&
                        !previousNonEmptyLine.startsWith("?") &&
                        !previousNonEmptyLine.startsWith(":")) ||
                        (line.startsWith(":") &&
                                previousNonEmptyLine.startsWith("?") &&
                                previousThirdNonEmptyLine.endsWith("="))

            val isContinuationLine = isAssignRhs || line.startsWith("=") || line.startsWith(".") || ((line.startsWith("?") || line.startsWith(":")) && !isAssignmentTernaryBranchLine) || line.startsWith("extends") || line.startsWith("implements") || line.startsWith("throws")
            val extraIndent = if (isAssignRhs) 2 else if (isContinuationLine) 1 else 0
            val lineIndentLevel = maxOf(0, blockIndent + parenIndent + extraIndent)

            if (line.startsWith("/**")) {
                inJavadoc = true
                outputLines.add(indentStr.repeat(lineIndentLevel) + line)
                if (line.endsWith("*/")) inJavadoc = false
                continue
            }
            if (inJavadoc) {
                if (line.startsWith("*")) {
                    outputLines.add(indentStr.repeat(lineIndentLevel) + " " + line)
                } else {
                    outputLines.add(indentStr.repeat(lineIndentLevel) + line)
                }
                if (line.contains("*/")) inJavadoc = false
                continue
            }

            if (line.startsWith("/*")) {
                inBlockComment = true
                outputLines.add(indentStr.repeat(lineIndentLevel) + line)
                if (line.endsWith("*/")) inBlockComment = false
                continue
            }
            if (inBlockComment) {
                outputLines.add(indentStr.repeat(lineIndentLevel) + line)
                if (line.contains("*/")) inBlockComment = false
                continue
            }

            if (line.startsWith("//")) {
                outputLines.add(indentStr.repeat(lineIndentLevel) + line)
                continue
            }

            line = normalizeControlFlowSpaces(line)
            line = normalizeAssignmentSpaces(line)
            line = normalizeOperatorSpaces(line)
            line = normalizeParenSpaces(line)
            line = normalizeCommaSpaces(line)
            line = normalizeBraceSpaces(line)

            val currentLineIndent = indentStr.repeat(lineIndentLevel)
            val fullLine = currentLineIndent + line

            outputLines.add(fullLine)

            val codeWithoutStrings = line.replace(Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')"""), "\"\"")

            for (chIdx in codeWithoutStrings.indices) {
                val char = codeWithoutStrings[chIdx]
                if (char == '{') {
                    blockIndent++
                } else if (char == '}') {
                    if (!startsWithClosingBrace) {
                        blockIndent = maxOf(0, blockIndent - 1)
                    }
                } else if (char == '(' || char == '[') {
                    val textAfterParen = codeWithoutStrings.substring(chIdx + 1).trim()
                    val hasCodeAfterParen = textAfterParen.isNotEmpty() && !textAfterParen.startsWith("//")
                    val addedParenIndent = if (hasCodeAfterParen) {
                        if (parenIndentStack.isNotEmpty()) parenIndentStack.last() else 1
                    } else {
                        lineIndentLevel + 1 - blockIndent
                    }
                    parenIndentStack.add(addedParenIndent)
                } else if (char == ')' || char == ']') {
                    if (!startsWithClosingParen && parenIndentStack.isNotEmpty()) {
                        parenIndentStack.removeAt(parenIndentStack.size - 1)
                    }
                }
            }
        }

        return outputLines
    }

    private fun normalizeControlFlowSpaces(line: String): String {
        return line
            .replace(Regex("""\bif\s*\("""), "if (")
            .replace(Regex("""\bfor\s*\("""), "for (")
            .replace(Regex("""\bwhile\s*\("""), "while (")
            .replace(Regex("""\bswitch\s*\("""), "switch (")
            .replace(Regex("""\bcatch\s*\("""), "catch (")
            .replace(Regex("""\}\s*else\s*if\b"""), "} else if")
            .replace(Regex("""\}\s*else\b"""), "} else")
            .replace(Regex("""\}\s*catch\b"""), "} catch")
            .replace(Regex("""\}\s*finally\b"""), "} finally")
    }

    private fun normalizeAssignmentSpaces(line: String): String {
        val parts = mutableListOf<String>()
        val regex = Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')""")
        var lastIdx = 0

        for (m in regex.findAll(line)) {
            val codeBefore = line.substring(lastIdx, m.range.first)
            parts.add(fixAssignmentOperatorSpaces(codeBefore))
            parts.add(m.value)
            lastIdx = m.range.last + 1
        }

        val codeRest = line.substring(lastIdx)
        parts.add(fixAssignmentOperatorSpaces(codeRest))

        return parts.joinToString("")
    }

    private fun fixAssignmentOperatorSpaces(code: String): String {
        var res = code.replace(Regex("""([^!\+\-\*\/\%\|\&\^\=\<\>\s])=(?!=)"""), "$1 =")
        res = res.replace(Regex("""(?<![!\+\-\*\/\%\|\&\^\=\<\>])=([^=\s])"""), "= $1")
        return res
    }

    private fun normalizeParenSpaces(line: String): String {
        val parts = mutableListOf<String>()
        val regex = Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')""")
        var lastIdx = 0

        for (m in regex.findAll(line)) {
            val codeBefore = line.substring(lastIdx, m.range.first)
            parts.add(codeBefore.replace(Regex("""\(\s+"""), "(").replace(Regex("""\s+\)"""), ")"))
            parts.add(m.value)
            lastIdx = m.range.last + 1
        }

        val codeRest = line.substring(lastIdx)
        parts.add(codeRest.replace(Regex("""\(\s+"""), "(").replace(Regex("""\s+\)"""), ")"))

        return parts.joinToString("")
    }

    private fun normalizeOperatorSpaces(line: String): String {
        val parts = mutableListOf<String>()
        val regex = Regex("""("([^"\\]|\\.)*"|'([^'\\]|\\.)*')""")
        var lastIdx = 0

        for (m in regex.findAll(line)) {
            val codeBefore = line.substring(lastIdx, m.range.first)
            parts.add(fixOperatorSpaces(codeBefore))
            parts.add(m.value)
            lastIdx = m.range.last + 1
        }

        val codeRest = line.substring(lastIdx)
        parts.add(fixOperatorSpaces(codeRest))

        return parts.joinToString("")
    }

    private fun fixOperatorSpaces(code: String): String {
        return code
            .replace(Regex("""\s*!=\s*"""), " != ")
            .replace(Regex("""(?<![!=><])\s*==\s*(?!=)"""), " == ")
            .replace(Regex("""(?<![<])\s*<=\s*(?!=)"""), " <= ")
            .replace(Regex("""(?<![>])\s*>=\s*(?!=)"""), " >= ")
    }

    private fun normalizeCommaSpaces(line: String): String {
        return line.replace(Regex(""",([^\s\/\*])"""), ", $1")
    }

    private fun normalizeBraceSpaces(line: String): String {
        return line.replace(Regex("""([a-zA-Z0-9_\>\]\)])\{"""), "$1 {")
    }

    private fun postProcessBlankLines(lines: List<String>): List<String> {
        val result = mutableListOf<String>()
        var consecutiveEmpty = 0

        for (i in lines.indices) {
            val line = lines[i]
            val isEmpty = line.trim().isEmpty()
            if (isEmpty) {
                var nextNonEmpty = ""
                for (j in (i + 1) until lines.size) {
                    val t = lines[j].trim()
                    if (t.isNotEmpty()) {
                        nextNonEmpty = t
                        break
                    }
                }
                if (nextNonEmpty.startsWith("?") || nextNonEmpty.startsWith(":") || nextNonEmpty.startsWith(".")) {
                    continue
                }

                consecutiveEmpty++
                if (consecutiveEmpty <= 1) {
                    result.add(line)
                }
            } else {
                consecutiveEmpty = 0
                result.add(line)
            }
        }

        return result
    }

    companion object {
        fun format(sourceCode: String, config: AccentureFormatterConfig = AccentureFormatterConfig()): String {
            return LegacyAccentureJavaFormatter(config).formatDocument(sourceCode)
        }
    }
}

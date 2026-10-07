package com.accenture.formatter.ast

import com.accenture.formatter.AccentureFormatterConfig
import com.accenture.formatter.LegacyAccentureJavaFormatter

class AstFormattingEngine(private val config: AccentureFormatterConfig) {
    private val legacyFormatter = LegacyAccentureJavaFormatter(config)
    var lastParseResult: AstParseResult? = null
        private set

    fun formatDocument(sourceCode: String): String {
        lastParseResult = AstParser.parse(sourceCode)

        // Keep output parity while all formatting requests pass through AST parsing.
        return legacyFormatter.formatDocument(sourceCode)
    }
}

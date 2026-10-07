package com.accenture.formatter

import com.accenture.formatter.ast.AstFormattingEngine

class AccentureJavaFormatter(private val config: AccentureFormatterConfig = AccentureFormatterConfig()) {
    private val astFormattingEngine = AstFormattingEngine(config)

    fun formatDocument(sourceCode: String): String {
        return astFormattingEngine.formatDocument(sourceCode)
    }

    companion object {
        fun format(sourceCode: String, config: AccentureFormatterConfig = AccentureFormatterConfig()): String {
            return AccentureJavaFormatter(config).formatDocument(sourceCode)
        }
    }
}

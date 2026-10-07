package com.accenture.formatter

data class AccentureFormatterConfig(
    val maxLineLength: Int = 70,
    val tabSize: Int = 4,
    val insertSpaces: Boolean = true,
    val braceStyle: String = "sameLine",
    val organizeImportsOnFormat: Boolean = true
)

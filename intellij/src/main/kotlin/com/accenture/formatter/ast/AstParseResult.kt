package com.accenture.formatter.ast

data class AstParseResult(
    val parseSucceeded: Boolean,
    val parseErrors: List<String>
)

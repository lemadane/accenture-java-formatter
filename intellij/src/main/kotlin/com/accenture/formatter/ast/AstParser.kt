package com.accenture.formatter.ast

import com.github.javaparser.ParseProblemException
import com.github.javaparser.StaticJavaParser

object AstParser {
    fun parse(sourceCode: String): AstParseResult {
        return try {
            StaticJavaParser.parse(sourceCode)
            AstParseResult(parseSucceeded = true, parseErrors = emptyList())
        } catch (problem: ParseProblemException) {
            AstParseResult(
                parseSucceeded = false,
                parseErrors = problem.problems.map { it.verboseMessage }
            )
        } catch (error: Throwable) {
            AstParseResult(
                parseSucceeded = false,
                parseErrors = listOf(error.message ?: error.toString())
            )
        }
    }
}

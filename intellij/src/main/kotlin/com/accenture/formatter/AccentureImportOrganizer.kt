package com.accenture.formatter

data class ImportResult(
    val hasImports: Boolean,
    val startLineIndex: Int,
    val endLineIndex: Int,
    val importsText: String
)

object AccentureImportOrganizer {

    fun organizeJavaImports(lines: List<String>): ImportResult {
        var startIdx = -1
        var endIdx = -1
        val importLines = mutableListOf<String>()

        for (i in lines.indices) {
            val line = lines[i].trim()
            if (line.startsWith("import ")) {
                if (startIdx == -1) startIdx = i
                endIdx = i
                importLines.add(line)
            }
        }

        if (importLines.isEmpty()) {
            return ImportResult(false, -1, -1, "")
        }

        val uniqueImports = importLines.distinct().sorted()

        val staticImports = uniqueImports.filter { it.startsWith("import static ") }
        val javaImports = uniqueImports.filter { !it.startsWith("import static ") && (it.startsWith("import java.") || it.startsWith("import javax.")) }
        val orgImports = uniqueImports.filter { !it.startsWith("import static ") && it.startsWith("import org.") }
        val accentureImports = uniqueImports.filter { !it.startsWith("import static ") && (it.startsWith("import com.accenture.") || it.startsWith("import accenture.")) }
        val otherImports = uniqueImports.filter { !it.startsWith("import static ") && !javaImports.contains(it) && !orgImports.contains(it) && !accentureImports.contains(it) }

        val groups = listOf(staticImports, javaImports, orgImports, accentureImports, otherImports)
            .filter { it.isNotEmpty() }

        val importsText = groups.joinToString("\n\n") { group -> group.joinToString("\n") }

        return ImportResult(true, startIdx, endIdx, importsText)
    }
}
